import datetime
import csv
import json
import requests
import pandas as pd
import numpy as np

from airflow.models import Variable
from airflow.decorators import dag, task

ORIGIN_DATASET_ID = '991ea482-db37-4ad6-b41b-939f8b85a29a'
CLEANED_DATASET_ID = 'e6074ba6-1d0d-4dc9-b031-08b72d9d0b00'
DESTINATION_DATASET_ID = 'a53235f3-90d2-4dbd-8889-61d4d8fc9e4b'
TOKEN = Variable.get("kdp_access_token")

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


def deduplicate_kdp4_data(kdp4_df:pd.DataFrame)->str:

    df = kdp4_df.drop_duplicates()

    return df.to_json(orient='records')


def create_route_indexed_data(kdp4_df:pd.DataFrame)->str:

    kdp4_df["route_order"] = np.nan

    for route_id in kdp4_df["route_id"].unique():
        route_sub_df = kdp4_df[kdp4_df["route_id"]==route_id]
        route_sub_df = route_sub_df.sort_values(by="timestamp", ascending=False)
        route_sub_df = route_sub_df.reset_index()
        for order, i in enumerate(route_sub_df["index"].values):
            kdp4_df.iloc[i, -1] = int(order)
    
    return kdp4_df.to_json(orient='records')


@dag(
    schedule_interval="* * * 1 *",
    start_date=datetime.datetime(2021, 1, 1),
    catchup=False,
    dagrun_timeout=datetime.timedelta(minutes=60),
)
def clean_transform_denver_protobuf():
    @task
    def clean_data():
        
        kdp4_df = read_entire_dataset_from_kdp4(ORIGIN_DATASET_ID, TOKEN)

        deduplicated_data = deduplicate_kdp4_data(kdp4_df)

        response = write_to_kdp4(deduplicated_data, CLEANED_DATASET_ID, TOKEN)
        if response.status_code == 200:
            return 0
        else:
            return 1

    @task
    def create_route_indexing():

        kdp4_df = read_entire_dataset_from_kdp4(CLEANED_DATASET_ID, TOKEN)

        indexed_data = create_route_indexed_data(kdp4_df)

        response = write_to_kdp4(indexed_data, DESTINATION_DATASET_ID, TOKEN)
        print(response.text)
        if response.status_code == 200:
            return 0
        else:
            return 1


    clean_data() >> create_route_indexing()

dag = clean_transform_denver_protobuf()
