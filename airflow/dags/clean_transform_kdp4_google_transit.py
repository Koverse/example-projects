import datetime
import csv
import json
import requests
import pandas as pd
import numpy as np

from airflow.models import Variable
from airflow.decorators import dag, task

ORIGIN_DATASET_ID = '991ea482-db37-4ad6-b41b-939f8b85a29a'
CLEANED_DATASET_ID = ''
DESTINATION_DATASET_ID = ''
TOKEN = Variable.get("kdp_access_token")

def write_to_kdp4(jsonData, datasetId, token):
    url = 'https://api.dev.koverse.com/write/' + datasetId
    authValue = 'Bearer ' + token
    headers = {"Content-Type": "application/json",
               "Authorization": authValue}
    
    print(url)
    response = requests.post(url, data=jsonData, headers=headers, timeout=10)
    return response

def read_from_kdp4(datasetId, token):
    read_url = 'https://api.dev.koverse.com/readInSequence'
    
    authValue = 'Bearer ' + token
    headers = {"Content-Type": "application/json",
               "Authorization": authValue}

    request_body = {'batchSize': 100,
                    'datasetId': datasetId,
                    'startingRecordId': ''
                    }

    request_body = json.dumps(request_body)

    response = requests.post(read_url, data=request_body, headers=headers, timeout=100)
    
    return response


def deduplicate_kdp4_data(kdp4_data:str)->str:
    df = pd.read_json(kdp4_data)

    df = df.drop_duplicates()

    return df.to_json()


def create_route_indexed_data(kdp4_data:str)->str:
    df = pd.read_json(kdp4_data)

    df["route_order"] = np.nan

    for route_id in df["route_id"].unique():
        route_sub_df = df[df["route_id"]==route_id]
        route_sub_df = route_sub_df.sort_values(by="timestamp", ascending=False)
        route_sub_df = route_sub_df.reset_index()
        for order, i in enumerate(route_sub_df["index"].values):
            df.iloc[i, -1] = int(order)
    
    return df.to_json()


@dag(
    schedule_interval="* * * 1 *",
    start_date=datetime.datetime(2021, 1, 1),
    catchup=False,
    dagrun_timeout=datetime.timedelta(minutes=60),
)
def clean_transform_denver_protobuf():
    @task
    def clean_data():
        
        read_response = read_from_kdp4(ORIGIN_DATASET_ID, TOKEN)

        deduplicated_data = deduplicate_kdp4_data(read_response)

        response = write_to_kdp4(deduplicated_data, CLEANED_DATASET_ID, TOKEN)
        print(response.text)
        if response.status_code == 200:
            return 0
        else:
            return 1

    @task
    def create_route_indexing():

        read_response = read_from_kdp4(CLEANED_DATASET_ID, TOKEN)

        indexed_data = create_route_indexed_data(read_response)

        response = write_to_kdp4(indexed_data, DESTINATION_DATASET_ID, TOKEN)
        print(response.text)
        if response.status_code == 200:
            return 0
        else:
            return 1


    clean_data() >> create_route_indexing()

dag = clean_transform_denver_protobuf()
