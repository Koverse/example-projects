from datetime import datetime, timedelta

from airflow.models import Variable
from airflow.decorators import dag, task
from airflow import DAG
from airflow.lineage import AUTO
from airflow.providers.papermill.operators.papermill import PapermillOperator


NOTEBOOK_PATH = '/opt/airflow/notebooks/'

TOKEN = Variable.get("kdp_access_token")

@dag(
    schedule_interval="0 0 * * *",
    start_date=datetime(2021, 1, 1),
    catchup=False,
    dagrun_timeout=timedelta(minutes=60)    
)
def papermill_test():
    
    execute_notebook = PapermillOperator(
        task_id="run_example_notebook",
        input_nb = NOTEBOOK_PATH + "airflow_test_write.ipynb",
        output_nb = NOTEBOOK_PATH + "airflow_test_output_notebook.ipynb",
    )

    execute_notebook

dag = papermill_test()
