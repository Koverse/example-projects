import datetime
import pendulum
import csv
import json
import requests

from airflow.models import Variable
from airflow.decorators import dag, task

CSV_PATH = '/opt/airflow/dags/files/employees.csv'

DATASET_ID = '1430423f-71f1-4e9c-8ec2-9be6f758d856'
TOKEN = Variable.get("kdp_access_token")

def get_json():
    data = []
    with open(CSV_PATH, encoding='utf-8') as csvf:
        csvReader = csv.DictReader(csvf)
        for row in csvReader:
            print(row)
            data.append(row)
    return json.dumps(data)

def write_to_kdp4(jsonData, datasetId, token):
    url = 'https://api.dev.koverse.dev/write/' + datasetId
    authValue = 'Bearer ' + token
    headers = {"Content-Type": "application/json",
               "Authorization": authValue}
    response = requests.post(url, data=jsonData, headers=headers, timeout=10)
    return response

@dag(
    schedule_interval="0 0 * * *",
    start_date=pendulum.datetime(2021, 1, 1, tz="UTC"),
    catchup=False,
    dagrun_timeout=datetime.timedelta(minutes=60),
)
def Etl():
    @task
    def get_data():
        url = "https://raw.githubusercontent.com/apache/airflow/main/docs/apache-airflow/pipeline_example.csv"

        response = requests.request("GET", url)
        #print("response: %s", response.text)

        with open(CSV_PATH, "w") as file:
            file.write(response.text)
            print("wrote file to %s", CSV_PATH)
        return 0

    @task
    def write_data():
        data = get_json()
        response = write_to_kdp4(data, DATASET_ID, TOKEN)
        print("status = %d", response.status_code)
        if res.status_code == 200:
            return 0
        else:
            return 1


    get_data() >> write_data()
    #get_data()


dag = Etl()
