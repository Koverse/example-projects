import datetime
import csv
import json
import requests
import pandas as pd
import numpy as np
import sqlite3
from collections import OrderedDict

from airflow.models import Variable
from airflow.decorators import dag, task

ORIGIN_DATASET_ID = '991ea482-db37-4ad6-b41b-939f8b85a29a'
CLEANED_DATASET_ID = 'e6074ba6-1d0d-4dc9-b031-08b72d9d0b00'
DESTINATION_DATASET_ID = 'a53235f3-90d2-4dbd-8889-61d4d8fc9e4b'
TOKEN = Variable.get("kdp_access_token")


SQLITE_LOCATION = '/opt/airflow/kdp4SolutionsDB'
SQLITE_ORIGIN_TABLE = 'rtdRaw'
SQLITE_CLEANED_TABLE = 'rtdClean'
SQLITE_DESTINATION_TABLE = 'rtdTransformed'

CLEAN_TABLE_SCHEMA = [{"latitude": "REAL"}, {"longitude": "REAL"}, {"route_id": "TEXT"}, {"timestamp": "INTEGER"}, {"id": "TEXT"}, {"update_count": "REAL"}]
DESTINATION_TABLE_SCHEMA = [{"latitude": "REAL"}, {"longitude": "REAL"}, {"route_id": "TEXT"}, {"timestamp": "INTEGER"}, {"id": "TEXT"}, {"route_order": "INTEGER"}, {"update_count": "REAL"}]

def sqlite_check_latest_iter(table_name):

    with sqlite3.connect(SQLITE_LOCATION) as con:
        try:
            cur = con.cursor()
            latest_iter = cur.execute("SELECT MAX(update_count) from {}".format(table_name)).fetchall()[0]
            print("latest_iter: ", latest_iter)
            latest_iter = latest_iter[0]
            print("type latest_iter: ", type(latest_iter))
            if latest_iter:
                return int(latest_iter)
            else:
                return 0

        except Exception as e:
            raise(e)

def write_to_sqlite(jsonData, table_name, table_schema):

    latest_iter = sqlite_check_latest_iter(table_name)

    latest_iter += 1

    print("latest_iter iterated: ", latest_iter)
    data_to_write = json.loads(jsonData)

    cols_to_insert = [list(k.keys())[0] for k in table_schema]
    cols_to_insert = ", ".join(cols_to_insert)

    with sqlite3.connect(SQLITE_LOCATION) as con:
        try:
            cur = con.cursor()

            unnested_schema = OrderedDict()
            for col_datatype in table_schema:
                for k,v in col_datatype.items():
                    unnested_schema[k] = v
            
            for entry in data_to_write:
                # print(entry)
                vals_to_insert = []

                for k, v in unnested_schema.items():
                    if k in entry.keys():
                        if k == "update_count":
                            vals_to_insert.append(str(latest_iter))
                        elif unnested_schema[k] == "TEXT":
                            vals_to_insert.append("'" + str(entry[k]) + "'")
                        else:
                            vals_to_insert.append(str(entry[k]))
                    else:
                        vals_to_insert.append("NULL")   

                vals_to_insert = ", ".join(vals_to_insert)

                insertion = "INSERT INTO {} ({})\nVALUES({})".format(table_name, cols_to_insert, vals_to_insert)
                print(insertion)
                cur.execute(insertion)

            con.commit()
            return {"status_code":200, "text":"successfully wrote to table {}".format(table_name)}

        except Exception as e:
            return {"status_code":400, "text":"couldn't write to table {}, {}".format(table_name, e)}


def read_table_from_sqlite(table_name):
        with sqlite3.connect(SQLITE_LOCATION) as con:
            df = pd.read_sql_query(f"SELECT * FROM {table_name}", con)
            return df


def write_to_kdp4(jsonData, datasetId, token):
    url = 'https://api.dev.koverse.com/write/' + datasetId
    authValue = 'Bearer ' + token
    headers = {"Content-Type": "application/json",
               "Authorization": authValue}

    print(url)
    response = requests.post(url, data=jsonData, headers=headers, timeout=10)
    return response

def read_from_kdp4(datasetId:str, token:str, starting_record_id:str='', batch_size:int=100)->dict:
    read_url = 'https://api.dev.koverse.com/readInSequence'
    
    authValue = 'Bearer ' + token
    headers = {"Content-Type": "application/json",
               "Authorization": authValue}

    request_body = {'datasetId': datasetId,
                    'startingRecordId': starting_record_id,
                    'batchSize': batch_size
                    }

    request_body = json.dumps(request_body)

    response = requests.post(read_url, data=request_body, headers=headers, timeout=100)
    
    response_content = response.text

    response_content = json.loads(response_content)

    return response_content

def read_entire_dataset_from_kdp4(datasetId:str, token:str, batch_size:int=100)->pd.DataFrame:

    kdp4_data = read_from_kdp4(datasetId, token)

    kdp4_records = kdp4_data.pop('records')
    kdp4_last_record_id = kdp4_data.pop('lastRecordId')
    kdp4_more = kdp4_data.pop('more')

    df = pd.DataFrame(kdp4_records)

    while kdp4_more:
        more_kdp4_data = read_from_kdp4(datasetId, token, kdp4_last_record_id)

        kdp4_records = more_kdp4_data.pop('records')
        kdp4_last_record_id = more_kdp4_data.pop('lastRecordId')
        kdp4_more = more_kdp4_data.pop('more')

        df_more = pd.DataFrame(kdp4_records)

        df = pd.concat([df, df_more], ignore_index=True)
    
    return df


def deduplicate_kdp4_data(kdp4_df:pd.DataFrame, update_count:int)->str:

    df = kdp4_df.drop_duplicates()

    df["update_count"] = update_count

    return df.to_json(orient='records')


def create_route_indexed_data(kdp4_df:pd.DataFrame)->str:

    kdp4_df["route_order"] = np.nan

    for _id in kdp4_df["id"].unique():
        id_sub_df = kdp4_df[kdp4_df["id"]==_id]
        id_sub_df = id_sub_df.sort_values(by="timestamp", ascending=False)
        for order, i in enumerate(id_sub_df.index.values):
            kdp4_df.iloc[i, -1] = order
    
    # print(kdp4_df["route_order"])
    
    return kdp4_df.to_json(orient='records')


@dag(
    schedule_interval="0 * * * *",
    start_date=datetime.datetime(2021, 1, 1),
    catchup=False,
    dagrun_timeout=datetime.timedelta(minutes=60),
)
def clean_transform_denver_protobuf():

    @task
    def set_latest_update_batch_from_sqlite_rtdClean():
        var_val = Variable.setdefault("update_iter_rtdClean", 0)

        if not var_val or var_val == "None":
            if type(var_val) is None:
                Variable.set("update_iter_rtdClean", sqlite_check_latest_iter(SQLITE_CLEANED_TABLE))

            elif var_val == "None":
                Variable.update("update_iter_rtdClean", sqlite_check_latest_iter(SQLITE_CLEANED_TABLE))

            elif not type(var_val) == int:
                Variable.update("update_iter_rtdClean", sqlite_check_latest_iter(SQLITE_CLEANED_TABLE))
                print("set update_iter to :", sqlite_check_latest_iter(SQLITE_CLEANED_TABLE))
        else:
            Variable.update("update_iter_rtdClean", sqlite_check_latest_iter(SQLITE_CLEANED_TABLE))

    @task
    def clean_data():
        
        # kdp4_df = read_entire_dataset_from_kdp4(ORIGIN_DATASET_ID, TOKEN)
        kdp4_df = read_table_from_sqlite(SQLITE_ORIGIN_TABLE)

        kdp4_df.drop("update_count", axis=1, inplace=True)

        deduplicated_data = deduplicate_kdp4_data(kdp4_df, Variable.get("update_iter_rtdClean"))

        # response = write_to_kdp4(deduplicated_data, CLEANED_DATASET_ID, TOKEN)
        response = write_to_sqlite(deduplicated_data, SQLITE_CLEANED_TABLE, CLEAN_TABLE_SCHEMA)

        print(response["text"])
        if response["status_code"] == 200:
            return 0
        else:
            return 1

    @task
    def set_latest_update_batch_from_sqlite_rtdTransformed():
        var_val = Variable.setdefault("update_iter_rtdTransformed", 0)

        if not var_val or var_val == "None":
            if type(var_val) is None:
                Variable.set("update_iter_rtdTransformed", sqlite_check_latest_iter(SQLITE_DESTINATION_TABLE))

            elif var_val == "None":
                Variable.update("update_iter_rtdTransformed", sqlite_check_latest_iter(SQLITE_DESTINATION_TABLE))

            elif not type(var_val) == int:
                Variable.update("update_iter_rtdTransformed", sqlite_check_latest_iter(SQLITE_DESTINATION_TABLE))
                print("set update_iter to :", sqlite_check_latest_iter(SQLITE_DESTINATION_TABLE))
        else:
            Variable.update("update_iter_rtdTransformed", sqlite_check_latest_iter(SQLITE_DESTINATION_TABLE))

    @task
    def create_route_indexing():

        # kdp4_df = read_entire_dataset_from_kdp4(CLEANED_DATASET_ID, TOKEN)
        kdp4_df = read_table_from_sqlite(SQLITE_CLEANED_TABLE)

        indexed_data = create_route_indexed_data(kdp4_df)

        # response = write_to_kdp4(indexed_data, DESTINATION_DATASET_ID, TOKEN)
        response = write_to_sqlite(indexed_data, SQLITE_DESTINATION_TABLE, DESTINATION_TABLE_SCHEMA)
        print(response["text"])
        if response["status_code"] == 200:
            return 0
        else:
            return 1


    set_latest_update_batch_from_sqlite_rtdClean() >> clean_data() >> set_latest_update_batch_from_sqlite_rtdTransformed() >> create_route_indexing()

dag = clean_transform_denver_protobuf()
