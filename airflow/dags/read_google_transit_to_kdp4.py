import datetime
import csv
import json
import requests

from airflow.models import Variable
from airflow.decorators import dag, task

from google.transit import gtfs_realtime_pb2

from protobuf_to_dict import protobuf_to_dict

DATASET_ID = ''
TOKEN = Variable.get("kdp_access_token")


def write_to_kdp4(jsonData, datasetId, token):
    url = 'https://api.staging.koverse.com/write/' + datasetId
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
    
        response = write_to_kdp4(json.dumps(data_entries), DATASET_ID, TOKEN)
        print(response.text)
        if response.status_code == 200:
            return 0
        else:
            return 1

    get_and_write_to_kdp4()

dag = denver_protobuf()
