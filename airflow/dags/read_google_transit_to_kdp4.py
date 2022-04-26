import datetime
import csv
import json
import requests
import sqlite3
import pandas as pd

from airflow.models import Variable
from airflow.decorators import dag, task

from google.transit import gtfs_realtime_pb2

from protobuf_to_dict import protobuf_to_dict

DATASET_ID = ''
TOKEN = Variable.get("kdp_access_token")

SQLITE_LOCATION = '/opt/airflow/kdp4SolutionsDB'
SQLITE_TABLE = 'rtdRaw'

def sqlite_check_latest_iter(table_name):

    with sqlite3.connect(SQLITE_LOCATION) as con:
        try:
            cur = con.cursor()
            latest_iter = cur.execute("SELECT MAX(update_count) from {}".format(table_name)).fetchall()[0]
            print(latest_iter)
            latest_iter = latest_iter[0]
            print("latest iter type: ", type(latest_iter))
            if latest_iter:
                return int(latest_iter)
            else:
                return 0

        except Exception as e:
            raise(e)

def write_to_sqlite(jsonData, table_name):

    latest_iter = int(Variable.get("update_iter"))

    data_to_write = json.loads(jsonData)

    with sqlite3.connect(SQLITE_LOCATION) as con:
        try:
            cur = con.cursor()
            for entry in data_to_write:
                null_checks = ["latitude", "longitude", "route_id", "timestamp", "id", "update_count"]
                for c in null_checks:
                    if c not in entry.keys():
                        entry[c] = None
                cur.execute("INSERT INTO {} (latitude, longitude, route_id, timestamp, id, update_count)\nVALUES({}, {}, {}, {}, {}, {})".format(
                    table_name, 
                    entry["latitude"] if entry["latitude"] else "NULL", 
                    entry["longitude"] if entry["longitude"] else "NULL", 
                    "'" + str(entry["route_id"])+ "'" if entry["route_id"] else "NULL",
                    entry["timestamp"] if entry["timestamp"] else "NULL",
                    "'" + str(entry["id"]) + "'" if entry["id"] else "NULL",
                    latest_iter + 1
                ))

            con.commit()
            return {"status_code":200, "text":"successfully wrote to table {}".format(table_name)}

        except Exception as e:
            return {"status_code":400, "text":"couldn't write to table {}, {}".format(table_name, e)}


def write_to_kdp4(jsonData, datasetId, token):
    url = 'https://api.dev.koverse.com/write/' + datasetId
    authValue = 'Bearer ' + token
    headers = {"Content-Type": "application/json",
               "Authorization": authValue}
    
    print(url)
    response = requests.post(url, data=jsonData, headers=headers, timeout=10)
    return response

@dag(
    schedule_interval="* * * * *",
    start_date=datetime.datetime(2021, 1, 1),
    catchup=False,
    dagrun_timeout=datetime.timedelta(minutes=60),
)
def denver_protobuf():
    @task
    def set_latest_update_batch_from_sqlite():
        var_val = Variable.setdefault("update_iter", 0)

        if not var_val or var_val == "None":
            if type(var_val) is None:
                Variable.set("update_iter", sqlite_check_latest_iter(SQLITE_TABLE))

            elif var_val == "None":
                Variable.update("update_iter", sqlite_check_latest_iter(SQLITE_TABLE))

            elif not type(var_val) == int:
                Variable.update("update_iter", sqlite_check_latest_iter(SQLITE_TABLE))
                print("set update_iter to :", sqlite_check_latest_iter(SQLITE_TABLE))
        else:
            Variable.update("update_iter", sqlite_check_latest_iter(SQLITE_TABLE))

    @task
    def get_and_write_to_kdp4():
        url = "https://www.rtd-denver.com/files/gtfs-rt/VehiclePosition.pb"

        feed = gtfs_realtime_pb2.FeedMessage()

        response = requests.get(url)

        feed.ParseFromString(response.content)
        
        data_entries = []

        # TODO set up schema definition in more sane way
        entry_fields ={"vehicle":
                {"position":{"latitude", "longitude", "bearing"},
                "trip":{"route_id"},
                "timestamp":set(),
                "vehicle": {"id"}}
                }

        def check_match(entity_dict, entry_fields):

            def _recurse(entry_fields, entity_iterated, last_key):
                if (type(entity_iterated) == dict and len(entity_iterated.values()) == 1):
                    yield entity_iterated
                elif (type(entity_iterated) == dict and len(entity_iterated.values()) == 0):
                    yield None
                elif type(entity_iterated) != dict:
                    yield {last_key : entity_iterated}
                else:
                    if type(entry_fields) == dict:
                        for entry_key in entry_fields.keys():
                            try:
                                yield from _recurse(entry_fields[entry_key], entity_iterated[entry_key], entry_key)
                            except:
                                print(f"{entry_key} key does not exist in data")
                    else:
                        for entry_key in entry_fields:
                            try:
                                yield from _recurse(entry_key, entity_iterated[entry_key], entry_key)
                            except:
                                print(f"{entry_key} key does not exist in data")
            
            return_dict = dict()
            [return_dict.update(kv) for kv in list(_recurse(entry_fields, entity_dict, 0))]
            
            return return_dict

        for entity in feed.entity:
            entity_dict = protobuf_to_dict(entity)

            individual_entry = check_match(entity_dict, entry_fields)

            data_entries.append(individual_entry)


        # response = write_to_kdp4(json.dumps(data_entries), DATASET_ID, TOKEN)
        response = write_to_sqlite(json.dumps(data_entries), SQLITE_TABLE)
        print(response["text"])
        if response["status_code"] == 200:
            return 0
        else:
            return 1

    set_latest_update_batch_from_sqlite() >> get_and_write_to_kdp4()

dag = denver_protobuf()
