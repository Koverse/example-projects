define([
  'require',
  'jquery',
  'moment',
  'base/js/namespace',
  'base/js/events',
  'notebook/js/codecell',
  'notebook/js/outputarea',
  'base/js/i18n',
  'notebook/js/cell',
  'notebook/js/celltoolbar',
  'notebook/js/completer',
  'codemirror/lib/codemirror'
    ], function(requirejs,
    $,
    moment,
    Jupyter,
    events,
    codecell,
    outputarea,
    i18n,
    cell,
    celltoolbar,
    completer,
    CodeMirror) {

      'use strict';

      var Cell = cell.Cell;
      var CodeCell = codecell.CodeCell;
      var OutputArea = outputarea.OutputArea;
      var executionPad = 0;
      var currentID = '';
      var absoluteInExecutionCounter = 0;
      var absoluteOutExecutionCounter = 1;
      const DEFAULT_CELL_COUNT = 4;
      const WELCOME_CELL_NUM = 4;

      // Declare mime type as constants
      var MIME_JAVASCRIPT = 'application/javascript';
      var MIME_HTML = 'text/html';
      var MIME_MARKDOWN = 'text/markdown';
      var MIME_LATEX = 'text/latex';
      var MIME_SVG = 'image/svg+xml';
      var MIME_PNG = 'image/png';
      var MIME_JPEG = 'image/jpeg';
      var MIME_GIF = 'image/gif';
      var MIME_PDF = 'application/pdf';
      var MIME_TEXT = 'text/plain';

      // Track absoluteInExecutionCounter
      /**
     * Execute current code cell to the kernel
     * @method execute
     */
    CodeCell.prototype.execute = function (stop_on_error) {
        if (!this.kernel) {
            console.log(i18n.msg._("Can't execute cell since kernel is not set."));
            return;
        }

        if (stop_on_error === undefined) {
            if (this.metadata !== undefined &&
                    this.metadata.tags !== undefined) {
                if (this.metadata.tags.indexOf('raises-exception') !== -1) {
                    stop_on_error = false;
                } else {
                    stop_on_error = true;
                }
            } else {
               stop_on_error = true;
            }
        }

        this.clear_output(false, true);
        var old_msg_id = this.last_msg_id;
        if (old_msg_id) {
            this.kernel.clear_callbacks_for_msg(old_msg_id);
            delete CodeCell.msg_cells[old_msg_id];
            this.last_msg_id = null;
        }
        if (this.get_text().trim().length === 0) {
            // nothing to do
            this.set_input_prompt(null);
            return;
        }
        this.set_input_prompt('*');
        this.element.addClass("running");
        var callbacks = this.get_callbacks();

        this.last_msg_id = this.kernel.execute(this.get_text(), callbacks, {silent: false, store_history: true,
            stop_on_error : stop_on_error});
        CodeCell.msg_cells[this.last_msg_id] = this;
        this.render();
        this.events.trigger('execute.CodeCell', {cell: this});
        var that = this;
        function handleFinished(evt, data) {
            if (that.kernel.id === data.kernel.id && that.last_msg_id === data.msg_id) {
                    that.events.trigger('finished_execute.CodeCell', {cell: that});
                that.events.off('finished_iopub.Kernel', handleFinished);
              }
        }
        this.events.on('finished_iopub.Kernel', handleFinished);

        absoluteInExecutionCounter += 1;
    };

      //Overwrite original function and edited to fix In[] incrementing
      CodeCell.prototype.set_input_prompt = function (number) {

        var nline = 1;
        if (this.code_mirror !== undefined) {
           nline = this.code_mirror.lineCount();
        }

        number -= executionPad;
        if (number < 1) {
          number = 0;
        }
        number = number || null;

        this.input_prompt_number = number;
        var prompt_html = CodeCell.input_prompt_function(this.input_prompt_number, nline);
        // This HTML call is okay because the user contents are escaped.
        this.element.find('div.input_prompt').html(prompt_html);
        this.events.trigger('set_dirty.Notebook', {value: true});

    };

    // Replace Out[3] with Login:  at initial Login Success line
    OutputArea.output_prompt_classical = function(prompt_value) {
     if (absoluteInExecutionCounter == WELCOME_CELL_NUM) {

       return $('<bdi>').text(i18n.msg.sprintf(i18n.msg._('Welcome'),prompt_value));
     }

       return $('<bdi>').text(i18n.msg.sprintf(i18n.msg._('Out[%d]:'),prompt_value));

   };

   OutputArea.output_prompt_function = OutputArea.output_prompt_classical;

      OutputArea.prototype.append_execute_result = function (json) {

              // Fixes initial Out[] incrementing
              var n = json.execution_count;
              n -= executionPad;
               n = n || ' ';
              var toinsert = this.create_output_area();
              this._record_display_id(json, toinsert);
              if (this.prompt_area) {


                  toinsert.find('div.prompt')
                          .addClass('output_prompt')
                          .empty()
                          .append(OutputArea.output_prompt_function(n));
                  absoluteOutExecutionCounter += 1;

              }
              var inserted = this.append_mime_type(json, toinsert);
              if (inserted) {
                  inserted.addClass('output_result');
              }
              this._safe_append(toinsert);
              // If we just output latex, typeset it.
              if ((json.data[MIME_LATEX] !== undefined) ||
                  (json.data[MIME_HTML] !== undefined) ||
                  (json.data[MIME_MARKDOWN] !== undefined)) {
                  this.typeset();
              }
          };


          /** @method create_element */
    CodeCell.prototype.create_element = function () {
        Cell.prototype.create_element.apply(this, arguments);
        var that = this;

        var cell =  $('<div></div>').addClass('cell code_cell');
        cell.attr('tabindex','2');

        var input = $('<div></div>').addClass('input');

        if (absoluteInExecutionCounter <= DEFAULT_CELL_COUNT) {
          input.hide();

        }


        this.input = input;
        var prompt = $('<div/>').addClass('prompt input_prompt');
        var inner_cell = $('<div/>').addClass('inner_cell');
        this.celltoolbar = new celltoolbar.CellToolbar({
            cell: this,
            notebook: this.notebook});
        inner_cell.append(this.celltoolbar.element);
        var input_area = $('<div/>').addClass('input_area');
        this.code_mirror = new CodeMirror(input_area.get(0), this._options.cm_config);
        // In case of bugs that put the keyboard manager into an inconsistent state,
        // ensure KM is enabled when CodeMirror is focused:
        this.code_mirror.on('focus', function () {
            if (that.keyboard_manager) {
                that.keyboard_manager.enable();
            }

            that.code_mirror.setOption('readOnly', !that.is_editable());
        });
        this.code_mirror.on('keydown', $.proxy(this.handle_keyevent,this));
        $(this.code_mirror.getInputField()).attr("spellcheck", "false");
        inner_cell.append(input_area);
        input.append(prompt).append(inner_cell);

        var output = $('<div></div>');
        cell.append(input).append(output);
        this.element = cell;
        this.output_area = new outputarea.OutputArea({
            config: this.config,
            selector: output,
            prompt_area: true,
            events: this.events,
            keyboard_manager: this.keyboard_manager,
        });
        this.completer = new completer.Completer(this, this.events);
    };

      // Automatically run default cells and protects the cells from accidental deletion and edit
        var autoRunCells = function() {

          var protectCells = function() {

          function patch_CodeCell_get_callbacks () {
              var old_get_callbacks = CodeCell.prototype.get_callbacks;
              CodeCell.prototype.get_callbacks = function () {
                  var callbacks = old_get_callbacks.apply(this, arguments);

                  var cell = this;
                  var prev_reply_callback = callbacks.shell.reply;

                  callbacks.shell.reply = function (msg) {
                      if (msg.msg_type === 'execute_reply') {

                        if (msg.content.execution_count <= DEFAULT_CELL_COUNT) {
                          executionPad = msg.content.execution_count;

                          $.extend(true, cell.metadata, {
                              trusted: true,
                              editable: false,
                              deletable: false
                          });
                        }
                      } else {

                      }
                      return prev_reply_callback(msg);
                  };
                  return callbacks;
              };
          };

        patch_CodeCell_get_callbacks();

      };


          function custom_kernel_ready_handler() {
          protectCells();

        for (var i = 0; i < DEFAULT_CELL_COUNT; i++) {
        Jupyter.notebook.execute_cells([i]);
      }
        Jupyter.notebook.select([DEFAULT_CELL_COUNT]);

}

function handle_kernel_ready() {
    // Create a nb_name variable with the name of the notebook
     console.log('kernel_ready.Kernel: handle_kernel_ready() was triggered!');
     custom_kernel_ready_handler();

     Jupyter.notebook.events.one('kernel_ready.Kernel', () => {
         //this recursive behavior is esential for `restart` kernel
         handle_kernel_ready();
    });
}

Jupyter.notebook.events.one('kernel_ready.Kernel', () => {
     handle_kernel_ready();
});
        };

        var add_kdp_login = function() {
            Jupyter.notebook.
            insert_cell_above('code', 0).
            set_text(`import os
import IPython
from kdp_connector import KdpConn
import requests
import json
from IPython.display import Markdown
import pandas as pd
from dateutil.relativedelta import relativedelta
from datetime import datetime
import kdp_api
from kdp_api.api import write_api
from kdp_api.api import datasets_api
import numpy as np
from glob import glob

jwt = os.getenv('ACCESS_TOKEN')
jwt_expire_time = os.getenv('ACCESS_TOKEN_EXPIRE')

bearer_token = 'Bearer ' + jwt
headers = {'Authorization': bearer_token}
user_request = requests.get('https://api.app.koverse.com/me', headers=headers)
user = json.loads(user_request.headers['Koverse-User'])

workspace_id = user['workspaceId']
email = user['email']
firstName = user['firstName']
lastName = user['lastName']
fullName = firstName + ' ' + lastName

path_to_ca_file = ''
host = 'https://api.app.koverse.com'

kdp_conn = KdpConn(path_to_ca_file=path_to_ca_file, host=host)

loginMessage = "## {} your session ends at: {}".format(fullName, jwt_expire_time)
`);


          Jupyter.notebook.
          insert_cell_above('code', 1).
          set_text(`def dfs_equivalent(df1, df2):

    '''
    Function to help determine if two dataframe are equivalent. Equivalent meaning that they share the same
    data except the order of rows or columns differ

    '''


    #Number of duplicated rows
    df1_dupe = df1.duplicated().sum()
    df2_dupe = df2.duplicated().sum()

    if df1_dupe != df2_dupe:
        return False

    DF1 = df1.copy().drop_duplicates()
    DF2 = df2.copy().drop_duplicates()

    mergeData = pd.merge(DF1, DF2, on = list(DF2.columns), how = 'inner')

    if len(DF1) == len(DF2) == len(mergeData):
        return True
    else:
        return False

def dfs_similar_data(df1, df2):

    '''
    Function to help determine if two dataframes are similar. Similar meaning that they have the same column
    names and data types for those columns.
    '''

    df1_dataTypes = pd.DataFrame(df1.dtypes).reset_index()
    df1_dataTypes.columns = ['Column', 'Type']
    df2_dataTypes = pd.DataFrame(df2.dtypes).reset_index()
    df2_dataTypes.columns = ['Column', 'Type']

    mergeData = pd.merge(df1_dataTypes, df2_dataTypes, on = ['Column', 'Type'], how = 'inner')

    if len(df1_dataTypes) == len(df2_dataTypes) == len(mergeData):
        return True
    else:
        return False

def dfs_difference_types(df1, df2):
    '''
    Helper function used to help output the differences between two input dataframes when they are not the
    same.
    '''

    df1_dataTypes = pd.DataFrame(df1.dtypes).reset_index()
    df1_dataTypes.columns = ['Column', 'Type']
    df2_dataTypes = pd.DataFrame(df2.dtypes).reset_index()
    df2_dataTypes.columns = ['Column', 'Type']

    mergeData = pd.merge(df1_dataTypes, df2_dataTypes, on = ['Column', 'Type'], how = 'outer', indicator = True)
    mergeData = mergeData[mergeData['_merge'].isin(['left_only', 'right_only'])]

    return mergeData

def overwrite_to_kdp(data, dataset_id, workspace_id, jwt, batch_size, starting_record_id, equivalenceCheck):
    '''
    This function provides a way to more directly write over an existing dataset name by deleting the existing
    dataset and replacing it with the transformed version.

    This feature likely should be used for normalizations as with transformations are typically written to another
    dataset.

    Ideally, there would be a way to define a custom dataset ID in order to assign the new dataset to have the
    same dataset ID as the original so that any pointers to the dataset ID are not disrupted. Slight modifications
    would be required to accomodate for the change since two datasets can't have the same ID. A temporary dataset
    ID would need to be created first to ensure the ingest is working properly before deleting the original dataset
    then creating the replacement dataset with the original dataset ID.

    Parameters:

    data - pandas df to write to KDP, the one that was read and normalized/transformed.
    dataset_id - the dataset ID of this of the dataset originally read into Jupyter
    workspace_id - matches initial settings
    jwt - matches initial settings
    batch_size - matches initial settings
    starting_record_id - matches initial settings
    equivalenceCheck - boolean option to check if input dataframe and reading from KDP are equivalent (having
    the same rows except in a different order).

    '''

    ingestFailed = False

    #API Config
    configuration = kdp_api.Configuration(
        host='https://api.app.koverse.com'
    )
    configuration.access_token = jwt

    #Get current dataset name
    current_name = kdp_conn.get_dataset(dataset_id=dataset_id, jwt=jwt).name

    #Create new dataset with same name on KDP
    dataset = kdp_conn.create_dataset(name=current_name, workspace_id=workspace_id, jwt=jwt)
    new_dataset_id = dataset.id

    #Ingest data into newly created dataset
    try:
        partitions_set = kdp_conn.ingest(data, new_dataset_id, jwt, batch_size)
    except:
        ingestFailed = True

    if not ingestFailed and equivalenceCheck:
        #Read df from KDP
        dfCheck = kdp_conn.read_dataset_to_pandas_dataframe(dataset_id=new_dataset_id,
                                                  jwt=jwt,
                                                  starting_record_id=starting_record_id,
                                                  batch_size=batch_size)
        if dfs_equivalent(dfCheck, data):
            print('equivalenceCheck pass')
        else:
            print('equivalenceCheck fail:')
            print('Input data length: {}'.format(len(data)))
            print('Input data non-duplicated length: {}'.format(len(data.drop_duplicates())))
            print('KDP data length: {}'.format(len(dfCheck)))
            print('KDP data non-duplicated length: {}'.format(len(dfCheck.drop_duplicates)))
            print('Merge data length: {}'.format(len(pd.merge(data.drop_duplicates(), dfCheck.drop_duplicates(),
                                                              on = list(data.columns), how = 'inner'))))
            raise Exception('equivalenceCheck failed, if wish to continue, disable this check.')


    #API Connect and delete either new dataset or old dataset by id
    with kdp_api.ApiClient(configuration) as api_client:

        if ingestFailed:
            try:
                print('Ingest failed. Attempting to delete newly created dataset')
                api_instance = datasets_api.DatasetsApi(api_client)
                api_instance.datasets_id_delete(id = new_dataset_id)
                print('Newly created dataset {} was successfully deleted.'.format(new_dataset_id))
            except kdp_api.ApiException as e:
                print("Exception : %s" % e)
                raise Exception("Error deleting associated dataset id from KDP. See printed error message above.")
            raise Exception('Ingest failed, exiting')

        else:
            print('Ingest successful. Deleting old dataset.')
            try:
                api_instance = datasets_api.DatasetsApi(api_client)
                api_instance = datasets_api.DatasetsApi(api_client)
                api_instance.datasets_id_delete(id = dataset_id)
                print('Dataset {} was successfully deleted.'.format(dataset_id))
            except kdp_api.ApiException as e:
                print("Exception : %s" % e)
                raise Exception("Error deleting associated dataset id from KDP. See printed error message above.")

    return new_dataset_id

def write_to_new_kdp(data, new_dataset_name, workspace_id, jwt, batch_size, starting_record_id, equivalenceCheck):

    '''
    This function provides a way to more directly write a dataframe into KDP as a new dataset with Pandas.
    Would be utilized for transformations.

    Parameters:

    data - pandas df to write to KDP, the one that was read and normalized/transformed.
    dataset_id - the dataset ID of this of the dataset originally read into Jupyter
    workspace_id - matches initial settings
    jwt - matches initial settings
    batch_size - matches initial settings
    starting_record_id - matches initial settings
    equivalenceCheck - boolean option to check if input dataframe and reading from KDP are equivalent (having
    the same rows except in a different order).


    '''


    ingestFailed = False

    #Create new dataset on KDP
    dataset = kdp_conn.create_dataset(name=new_dataset_name, workspace_id=workspace_id, jwt=jwt)
    new_dataset_id = dataset.id

    #Ingest data into newly created dataset
    try:
        partitions_set = kdp_conn.ingest(data, new_dataset_id, jwt, batch_size)
    except:
        ingestFailed = True

    if not ingestFailed and equivalenceCheck:
        #Read df from KDP
        dfCheck = kdp_conn.read_dataset_to_pandas_dataframe(dataset_id=new_dataset_id,
                                                  jwt=jwt,
                                                  starting_record_id=starting_record_id,
                                                  batch_size=batch_size)
        if dfs_equivalent(dfCheck, data):
            print('equivalenceCheck pass')
        else:
            print('equivalenceCheck fail:')
            print('Input data length: {}'.format(len(data)))
            print('Input data non-duplicated length: {}'.format(len(data.drop_duplicates())))
            print('KDP data length: {}'.format(len(dfCheck)))
            print('KDP data non-duplicated length: {}'.format(len(dfCheck.drop_duplicates)))
            print('Merge data length: {}'.format(len(pd.merge(data.drop_duplicates(), dfCheck.drop_duplicates(),
                                                              on = list(data.columns), how = 'inner'))))
            raise Exception('equivalenceCheck failed, if wish to continue, disable this check.')


    #API Connect and delete new dataset if ingest failed
    if ingestFailed:

        #API Config
        configuration = kdp_api.Configuration(
            host='https://api.app.koverse.com'
        )
        configuration.access_token = jwt

        with kdp_api.ApiClient(configuration) as api_client:
            try:
                print('Ingest failed. Attempting to delete newly created dataset')
                api_instance = datasets_api.DatasetsApi(api_client)
                api_instance.datasets_id_delete(id = new_dataset_id)
                print('Newly created dataset {} was successfully deleted.'.format(new_dataset_id))
            except kdp_api.ApiException as e:
                print("Exception : %s" % e)
                raise Exception("Error deleting associated dataset id from KDP. See printed error message above.")
            raise Exception('Ingest failed, exiting')

    return new_dataset_id

def write_to_existing_kdp(data, target_dataset_id, workspace_id, jwt, batch_size, starting_record_id, ingestCheck, equivalenceCheck, similarCheck, returnNewData):

    '''
    This function provides a way to more directly write into an existing KDP dataset and append additional rows
    with Pandas. Since this can be potentially dangerous, there are safety checks in place to ensure the integrity
    of the data.

    Parameters:

    data - pandas df to write to KDP, the one that was read and normalized/transformed.
    dataset_id - the dataset ID of this of the dataset originally read into Jupyter
    workspace_id - matches initial settings
    jwt - matches initial settings
    batch_size - matches initial settings
    starting_record_id - matches initial settings
    ingestCheck - boolean option to check if ingest is working properly.
    equivalenceCheck - boolean option to check if input dataframe and reading from KDP are equivalent (having
    the same rows or columns except in a different order). ingestCheck must be enabled for this check to work.
    similarCheck - boolean option to check if the incoming data is similar to the target dataset. Similar
    meaning same column names with the same data types.
    returnNewData - boolean option to return the dataset with the appended data as output

    '''

    ingestFailed = False

    #Check if ingest works
    if ingestCheck:
        #Create new dataset with temporary name
        tempName = 'Temporary_'+ str(np.random.randint(10000000))
        temp_dataset = kdp_conn.create_dataset(name=tempName, workspace_id=workspace_id, jwt=jwt)
        temp_dataset_id = temp_dataset.id

        #Ingest data into newly created dataset
        try:
            partitions_set = kdp_conn.ingest(data, temp_dataset_id, jwt, batch_size)
        except:
            ingestFailed = True

        if not ingestFailed:

            #If ingest successful and perform equivalenceCheck
            if equivalenceCheck:

                dfCheck = kdp_conn.read_dataset_to_pandas_dataframe(dataset_id=temp_dataset_id,
                                                      jwt=jwt,
                                                      starting_record_id=starting_record_id,
                                                      batch_size=batch_size)
                if dfs_equivalent(dfCheck, data):
                    print('equivalenceCheck pass')
                else:
                    print('equivalenceCheck fail:')
                    print('Input data length: {}'.format(len(data)))
                    print('Input data non-duplicated length: {}'.format(len(data.drop_duplicates())))
                    print('KDP data length: {}'.format(len(dfCheck)))
                    print('KDP data non-duplicated length: {}'.format(len(dfCheck.drop_duplicates)))
                    print('Merge data length: {}'.format(len(pd.merge(data.drop_duplicates(), dfCheck.drop_duplicates(),
                                                                      on = list(data.columns), how = 'inner'))))
                    raise Exception('equivalenceCheck failed, if wish to continue, disable this check.')


    if similarCheck:
        #Check if data similar to target dataset data
        targetDf = kdp_conn.read_dataset_to_pandas_dataframe(dataset_id=target_dataset_id,
                                                  jwt=jwt,
                                                  starting_record_id=starting_record_id,
                                                  batch_size=batch_size)

        if dfs_similar_data(targetDf, data):
            print('Similar data check pass')
        else:
            print('Similar data check failed. See below for differences.')
            print(dfs_difference_types(targetDf, data))
            raise Exception('Similar data check failed, if wish to continue, disable similarCheck.')


    if not ingestFailed:
        #Ingest data into KDP dataset via append
        try:
            partitions_set = kdp_conn.ingest(data, target_dataset_id, jwt, batch_size)
        except:
            ingestFailed = True

    if ingestCheck:

        #API Config
        configuration = kdp_api.Configuration(
            host='https://api.app.koverse.com'
        )
        configuration.access_token = jwt

        #Delete temporary dataset if ingestCheck enabled
        with kdp_api.ApiClient(configuration) as api_client:
            try:
                print('Deleting temporary dataset')
                api_instance = datasets_api.DatasetsApi(api_client)
                api_instance.datasets_id_delete(id = temp_dataset_id)
                print('Temporary dataset {} was successfully deleted.'.format(temp_dataset_id))
            except kdp_api.ApiException as e:
                print("Exception : %s" % e)
                raise Exception("Error deleting associated dataset id from KDP. See printed error message above.")

    if returnNewData:
        targetDf = kdp_conn.read_dataset_to_pandas_dataframe(dataset_id=target_dataset_id,
                                                  jwt=jwt,
                                                  starting_record_id=starting_record_id,
                                                  batch_size=batch_size)

        return targetDf



`);

            Jupyter.notebook.
            insert_cell_above('code', 2).
            set_text(`%%html
<style>

div.cell {

padding: 0px;

}

</style>`);

        Jupyter.notebook.
        insert_cell_above('code', 3).
        set_text(`Markdown(loginMessage)`);


      };




      // Run on start
    function load_ipython_extension() {

        //Add default cells to new notebooks
        if (Jupyter.notebook.get_cells().length===1){
            add_kdp_login();

        }

          autoRunCells();




    }
    return {
        load_ipython_extension: load_ipython_extension
    };
});
