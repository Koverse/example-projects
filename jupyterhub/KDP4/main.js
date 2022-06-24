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
  'codemirror/lib/codemirror',
  'notebook/js/textcell',
  'notebook/js/notebook'
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
    CodeMirror,
    textcell,
    notebook) {

      'use strict';

      var Notebook = notebook.Notebook;
      Notebook.trusted = true;
      var TextCell = textcell.TextCell;
      var Cell = cell.Cell;
      var CodeCell = codecell.CodeCell;
      var OutputArea = outputarea.OutputArea;
      var executionPad = 0;
      var currentID = '';
      var absoluteInExecutionCounter = 0;
      var absoluteOutExecutionCounter = 1;
      //const DEFAULT_CELL_COUNT = 45;
      const WELCOME_CELL_NUM = 3;
      var LAST_DEFAULT_CELL = WELCOME_CELL_NUM;


      //Special index arrays for tracking beginning/end of tutorial modules
      var RWTI;


      var soundAlertsSelection = 'Off';
      var textAlertsSelection = 'Off';
      var emailAlertsSelection = 'Off';
      var readWriteFlowTutorialSelection = 'Off';
      var phoneNumber = ''

      const TEXTERRORDELAY = 10;
      const EMAILERRORDELAY = 10;

      var textErrorTriggerTime = ((new Date().getTime()) / 1000)-(TEXTERRORDELAY+1);
      var emailErrorTriggerTime = ((new Date().getTime()) / 1000)-(EMAILERRORDELAY+1);

      var music = new Audio("KDP4/Moo.wav");
      var buttonSound = new Audio("KDP4/TurnOn.wav");

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


      var modal = function (options) {

        var modal = $("<div/>")
            .addClass("modal")
            .addClass("fade")
            .attr("role", "dialog");
        var dialog = $("<div/>")
            .addClass("modal-dialog")
            .appendTo(modal);
        var dialog_content = $("<div/>")
            .addClass("modal-content")
            .appendTo(dialog);
        if(typeof(options.body) === 'string' && options.sanitize !== false){
            options.body = $("<p/>").text(options.body);
        }
        dialog_content.append(
            $("<div/>")
                .addClass("modal-header")
                .mousedown(function() {
                  $(".modal").draggable({handle: '.modal-header'});
                })
                .append($("<button>")
                    .attr("type", "button")
                    .addClass("close")
                    .attr("data-dismiss", "modal")
                    .attr("aria-hidden", "true")
                    .html("&times;")
                ).append(
                    $("<h4/>")
                        .addClass('modal-title')
                        .text(options.title || "")
                )
        ).append(
            $("<div/>")
                .addClass("modal-body")
                .append(
                    options.body || $("<p/>")
                )
        );

        var footer = $("<div/>").addClass("modal-footer");

        var default_button;

        for (var label in options.buttons) {
            var btn_opts = options.buttons[label];
            var button = $("<button/>")
                .addClass("btn btn-default btn-sm")
                .attr("data-dismiss", "modal")
                .text(i18n.msg.translate(label).fetch());
            if (btn_opts.id) {
                button.attr('id', btn_opts.id);
            }
            if (btn_opts.click) {
                button.click($.proxy(btn_opts.click, dialog_content));
            }
            if (btn_opts.class) {
                button.addClass(btn_opts.class);
            }
            footer.append(button);
            if (options.default_button && label === options.default_button) {
                default_button = button;
            }
        }
        if (!options.default_button) {
            default_button = footer.find("button").last();
        }
        dialog_content.append(footer);
        // hook up on-open event
        modal.on("shown.bs.modal", function () {
            setTimeout(function () {
                default_button.focus();
                if (options.open) {
                    $.proxy(options.open, modal)();
                }
            }, 0);
        });

        // destroy modal on hide, unless explicitly asked not to
        if (options.destroy === undefined || options.destroy) {
            modal.on("hidden.bs.modal", function () {
                music.pause();
                music.currentTime = 0;
                modal.remove();
            });
        }
        modal.on("hidden.bs.modal", function () {
            if (options.notebook) {
                var cell = options.notebook.get_selected_cell();
                if (cell) cell.select();
            }
            if (options.keyboard_manager) {
                options.keyboard_manager.enable();
                options.keyboard_manager.command_mode();
            }
        });

        if (options.keyboard_manager) {
            options.keyboard_manager.disable();
        }

        if(options.backdrop === undefined){
          options.backdrop = 'static';
        }

        return modal.modal(options);
    };


      OutputArea.prototype.append_output = function (json) {
        this.expand();

        if (this.clear_queued) {
            this.clear_output(false);
            this._needs_height_reset = true;
        }

        var record_output = true;
        switch(json.output_type) {
            case 'update_display_data':
                record_output = false;
                json = this.validate_mimebundle(json);
                this.update_display_data(json);
                return;
            case 'execute_result':
                json = this.validate_mimebundle(json);
                this.append_execute_result(json);
                break;
            case 'stream':
                // append_stream might have merged the output with earlier stream output
                record_output = this.append_stream(json);
                break;
            case 'error':
                this.append_error(json);
                console.log(json);
                console.log('ERROR1');
                //json['ename']   // NameError
                //json['evalue']   // name 'x' is not defined
                //json['traceback']  (need length func and for loop)

                var current_cell_index = Jupyter.notebook.find_cell_index(Jupyter.notebook.get_selected_cell());
                var errorString = "";

                for (var i = 0; i < json['traceback'].length; i++) {
                  errorString += json['traceback'][i];
                  errorString += "\n";
                }


                if (textAlertsSelection === 'On') {

                  if (((new Date().getTime()) / 1000) - textErrorTriggerTime >= TEXTERRORDELAY) {

                    //Putting redefine here instead of bottom to avoid error loops
                    textErrorTriggerTime = (new Date().getTime()) / 1000;

                // Execute cell below and delete // x+1 if not at the bottom, //x+2 if at the bottom
                Jupyter.notebook.
                insert_cell_below('code', current_cell_index).
                set_text(String.raw`ename = "${json['ename']}"
evalue = "${json['evalue']}"
ansiString = """${errorString}"""
ansi_escape_8bit = re.compile(
     '(?:\x1B[@-Z\\-_]|[\x80-\x9A\x9C-\x9F]|(?:\x1B\[|\x9B)[0-?]*[ -/]*[@-~])'
)
errorString = ansi_escape_8bit.sub('', ansiString)

url="https://www.textnow.com/api/sessions"
login_url = 'https://www.textnow.com/login'
messaging_url = 'https://www.textnow.com/messaging'

try:
    %store -r user_agent
    user_agent

except:

    finduseragent_url = 'https://www.whatsmyua.info/'

    scraper = cloudscraper.create_scraper()
    req = scraper.get(finduseragent_url)
    resp = req.text
    needle = 'id="rawUa">rawUa: '
    needle_index = resp.find(needle)
    token_start = needle_index + len(needle)
    token_end = resp.find('<', token_start)
    user_agent = resp[token_start:token_end]

    if not any([x in user_agent for x in ['Mozilla', 'Chrome', 'Safari', 'Apple', 'Macintosh', 'Gecko']]):
        needle = 'WMUArawUa = "'
        needle_index = resp.find(needle)
        token_start = needle_index + len(needle)
        token_end = resp.find('"', token_start)
        user_agent = resp[token_start:token_end]

        if not any([x in user_agent for x in ['Mozilla', 'Chrome', 'Safari', 'Apple', 'Macintosh', 'Gecko']]):
            needle = 'class="input">'
            needle_index = resp.find(needle)
            token_start = needle_index + len(needle)
            token_end = resp.find('<', token_start)
            user_agent = resp[token_start:token_end]

    user_agent = user_agent.strip()
    %store user_agent

with requests.Session() as s:

    loginGetHeaders = {
    "User-Agent": """{}""".format(user_agent),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding":"gzip, deflate, br",
    "DNT": "1",
    "Referer": "https://www.textnow.com/",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "TE": "trailers"
    }

    r = s.get(login_url, headers = loginGetHeaders)
    XSRF_TOKEN = r.cookies.get_dict()['XSRF-TOKEN']

    loginHeaders = {
        "User-Agent": """{}""".format(user_agent).strip(),
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.5",
        "referer": "https://www.textnow.com/login",
        "x-csrf-token": XSRF_TOKEN,
        "content-type": "application/json;charset=utf-8",
        "x-xsrf-token": XSRF_TOKEN,
        "origin": "https://www.textnow.com",
        "dnt":"1",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "te": "trailers"
    }

    data = {
        'remember': True,
        'username': textnow_email,
        'password': textnow_password,
        'disable_session': False,

    }

    r2 = s.post(url, json=data, headers=loginHeaders)

    if r2.status_code != 200:
        print('Error')

    else:

        r3 = s.get("https://www.textnow.com/api/users/"+textnow_username)

        connectSID = r2.cookies.get_dict()['connect.sid']
        _csrf = r.cookies.get_dict()['_csrf']
        textnow_number = json.loads(r3.text)['phone_number']

        scraper = cloudscraper.create_scraper()

        cookies = {
                    'connect.sid': connectSID,
                    '_csrf': _csrf,
                }

        req = scraper.get(messaging_url, cookies=cookies)

        resp = req.text
        needle = 'csrf-token" content="'
        needle_index = resp.find(needle)
        token_start = needle_index + len(needle)
        token_end = resp.find('"', token_start)
        csrf_token = resp[token_start:token_end]

        def replace_newlines(text):
            return re.sub(r'(?<!\\)\n', r'\\n', text)

        notebook_name = "${IPython.notebook.notebook_name}"
        current_time = datetime.today().strftime("%Y-%m-%d %H:%M:%S")

        textMessage = 'Your notebook, {} ran into an error today, {}.'.format(notebook_name, current_time)
        textMessage += ' Please refer to it or see your email for more details.'
        text = replace_newlines(textMessage)
        for phone_number in all_phone_numbers:
            data = \
                {
                    'json': '{"contact_value":"' + phone_number + '","contact_type":2,"message":"' + text + '","read":1,'
                                                                                                  '"message_direction":2,'
                                                                                                  '"message_type":1,'
                                                                                                  '"from_name":"' +
                            textnow_username + '","has_video":false,"new":true,"date":"' + datetime.now().isoformat() + '"} '
                }


            headers = {
                        'user-agent': """{}""".format(user_agent).strip(),
                        'x-csrf-token': csrf_token
                    }

            scraper.post('https://www.textnow.com/api/users/' + textnow_username + '/messages',
                                             headers=headers, cookies=cookies, data=data)




`);

                var hideCells = document.querySelectorAll('.code_cell div.input');
                //hideCells[(current_cell_index+1)].style.display = 'none';

                Jupyter.notebook.execute_cells([(current_cell_index+1)]);
                Jupyter.notebook.delete_cells([(current_cell_index+1)]);

                executionPad += 1;

              }
}

              if (emailAlertsSelection === 'On') {

                if (((new Date().getTime()) / 1000) - emailErrorTriggerTime >= EMAILERRORDELAY) {

                  //Put at top instead of bottom to avoid error loops especially while developing
                  emailErrorTriggerTime = (new Date().getTime()) / 1000;

                Jupyter.notebook.
                insert_cell_below('code', current_cell_index).
                set_text(String.raw`ename = "${json['ename']}"
evalue = "${json['evalue']}"
ansiString = """${errorString}"""
ansi_escape_8bit = re.compile(
     '(?:\x1B[@-Z\\-_]|[\x80-\x9A\x9C-\x9F]|(?:\x1B\[|\x9B)[0-?]*[ -/]*[@-~])'
)
errorString = ansi_escape_8bit.sub('', ansiString).replace("\n", "<br>")

notebook_name = "${IPython.notebook.notebook_name}"
current_time = datetime.today().strftime("%Y-%m-%d %H:%M:%S")

for e in all_emails:
    message = Mail(
        from_email=e,
        to_emails=e,
        subject=notebook_name + ' - ' + current_time,
        html_content=errorString)


    sg = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
    response = sg.send(message)`);

            var hideCells = document.querySelectorAll('.code_cell div.input');
            //hideCells[(current_cell_index+1)].style.display = 'none';

            Jupyter.notebook.execute_cells([(current_cell_index+1)]);
            Jupyter.notebook.delete_cells([(current_cell_index+1)]);

            executionPad += 1;


          }
}

                if (soundAlertsSelection === 'On') {

                const randomNumber = Math.floor(Math.random() * 5);
                music.pause();

                if ([0, 1, 2, 3].includes(randomNumber)) {

                music.src = "KDP4/Moo.wav";
                music.loop = true;
                music.play();

              } else {

                music.src = "KDP4/Error.mp3";
                music.loop = true;
                music.play();
              }

              modal({
                  title: 'Your notebook ran into an error',
                  body: 'Close this window to stop the alarm.',
                  buttons: {
                      'Exit': {
                          click : function () {
                            music.pause();
                            music.currentTime = 0;

                          }
                      }
                  }
              });
          }

              break;
          case 'display_data':
              // append handled below
              json = this.validate_mimebundle(json);
              break;
          default:
              console.log("unrecognized output type: " + json.output_type);
              this.append_unrecognized(json);
      }

      if (json.output_type === 'display_data') {
          var that = this;
          this.append_display_data(json, this.handle_appended);
      } else {
          this.handle_appended();
      }

      if (record_output) {
          this.outputs.push(json);
      }

      this.events.trigger('output_added.OutputArea', {
          output: json,
          output_area: this,
      });
  };


      //Custom Code: Add execution pad so that the In [#] appears correctly
      //when pasting cells
      CodeCell.prototype.fromJSON = function (data) {

        Cell.prototype.fromJSON.apply(this, arguments);
        if (data.cell_type === 'code') {
            if (data.source !== undefined) {
                this.set_text(data.source);
                // make this value the starting point, so that we can only undo
                // to this state, instead of a blank cell
                this.code_mirror.clearHistory();
                this.auto_highlight();
            }

            //Custom Code: Add execution pad so that the In [#] appears correctly
            //when pasting cells
            this.set_input_prompt(data.execution_count+executionPad);
            this.output_area.trusted = data.metadata.trusted || false;
            this.output_area.fromJSON(data.outputs, data.metadata);
        }
    };

      // Placeholder, previously used for custom code
      Notebook.prototype.insert_cell_at_index = function(type, index){

        var ncells = this.ncells();
        index = Math.min(index, ncells);
        index = Math.max(index, 0);
        var cell = null;
        type = type || this.class_config.get_sync('default_cell_type');
        if (type === 'above') {
            if (index > 0) {
                type = this.get_cell(index-1).cell_type;
            } else {
                type = 'code';
            }
        } else if (type === 'below') {
            if (index < ncells) {
                type = this.get_cell(index).cell_type;
            } else {
                type = 'code';
            }
        } else if (type === 'selected') {
            type = this.get_selected_cell().cell_type;
        }

        if (ncells === 0 || this.is_valid_cell_index(index) || index === ncells) {
            var cell_options = {
                events: this.events,
                config: this.config,
                keyboard_manager: this.keyboard_manager,
                notebook: this,
                tooltip: this.tooltip
            };
            switch(type) {
            case 'code':
                cell = new codecell.CodeCell(this.kernel, cell_options);
                cell.set_input_prompt();
                break;
            case 'markdown':
                cell = new textcell.MarkdownCell(cell_options);
                break;
            case 'raw':
                cell = new textcell.RawCell(cell_options);
                break;
            default:
                console.log("Unrecognized cell type: ", type, cellmod);
                cell = new cellmod.UnrecognizedCell(cell_options);
            }

            if(this._insert_element_at_index(cell.element,index)) {
                cell.render();
                this.events.trigger('create.Cell', {'cell': cell, 'index': index});
                cell.refresh();
                // We used to select the cell after we refresh it, but there
                // are now cases were this method is called where select is
                // not appropriate. The selection logic should be handled by the
                // caller of the the top level insert_cell methods.
                this.set_dirty(true);
            }

        }

        return cell;

    };

    //Custom Code: The following insert, copy, and paste related functions have the same purpose.
    //Adding some additional logic to make it impossible to manipulate the default 3 cells or so at
    //the beginning of the notebook that contain important variable definition
    Notebook.prototype.insert_cell_above = function (type, index) {
      var current_cell_index = Jupyter.notebook.find_cell_index(Jupyter.notebook.get_selected_cell());
      if (Jupyter.notebook.get_cells().length <= (WELCOME_CELL_NUM-1)) {

        if (index === null || index === undefined) {
            index = Math.min(this.get_selected_index(index), this.get_anchor_index());
        }
        return this.insert_cell_at_index(type, index);

      } else if (current_cell_index < WELCOME_CELL_NUM) {
      } else {
        if (index === null || index === undefined) {
            index = Math.min(this.get_selected_index(index), this.get_anchor_index());
        }
        return this.insert_cell_at_index(type, index);
      }
   };

   Notebook.prototype.insert_cell_below = function (type, index) {

     var current_cell_index = Jupyter.notebook.find_cell_index(Jupyter.notebook.get_selected_cell());
      if (Jupyter.notebook.get_cells().length <= (WELCOME_CELL_NUM-1)) {
        if (index === null || index === undefined) {
            index = Math.max(this.get_selected_index(index), this.get_anchor_index());
        }
        return this.insert_cell_at_index(type, index+1);


      } else if (current_cell_index < (WELCOME_CELL_NUM-1)) {
      } else {
        if (index === null || index === undefined) {
            index = Math.max(this.get_selected_index(index), this.get_anchor_index());
        }
        return this.insert_cell_at_index(type, index+1);

      }};

   Notebook.prototype.copy_cell = function () {

        var cells = this.get_selected_cells();
        if (cells.length === 0) {
            cells = [this.get_selected_cell()];
        }

        this.clipboard = [];
        var cell_json;
        for (var i=0; i < cells.length; i++) {
            cell_json = cells[i].toJSON();
            var current_cell_index = Jupyter.notebook.find_cell_index(cells[i]);

            if (current_cell_index < WELCOME_CELL_NUM || cell_json.metadata.deletable === false) {
              continue;
            }
            if (cell_json.metadata.deletable !== undefined) {
                delete cell_json.metadata.deletable;
            }
            if (cell_json.id !== undefined) {
                delete cell_json.id;
            }
            this.clipboard.push(cell_json);
        }
        this.enable_paste();
    };

    Notebook.prototype.move_cell_up = function (index) {
        console.warn('Notebook.move_cell_up is deprecated as of v4.1 and will be removed in v5.0');
        var current_cell_index = Jupyter.notebook.find_cell_index(Jupyter.notebook.get_selected_cell());
        if (current_cell_index <= (WELCOME_CELL_NUM) && Jupyter.notebook.get_cells().length >= (WELCOME_CELL_NUM)) {

        } else {


        if(index === undefined){
            this.move_selection_up();
            return this;
        }

        var i = this.index_or_selected(index);
        if (this.is_valid_cell_index(i) && i > 0) {
            var pivot = this.get_cell_element(i-1);
            var tomove = this.get_cell_element(i);
            if (pivot !== null && tomove !== null) {
                tomove.detach();
                pivot.before(tomove);
                this.select(i-1);
                var cell = this.get_selected_cell();
                cell.focus_cell();
            }
            this.set_dirty(true);
        }
        return this;}
    };

    Notebook.prototype.move_cell_down = function (index) {
        console.warn('Notebook.move_cell_down is deprecated as of v4.1 and will be removed in v5.0');
        var current_cell_index = Jupyter.notebook.find_cell_index(Jupyter.notebook.get_selected_cell());
        if (current_cell_index < (WELCOME_CELL_NUM) && Jupyter.notebook.get_cells().length >= (WELCOME_CELL_NUM)) {
        } else {

        if(index === undefined){
            this.move_selection_down();
            return this;
        }

        var i = this.index_or_selected(index);
        if (this.is_valid_cell_index(i) && this.is_valid_cell_index(i+1)) {
            var pivot = this.get_cell_element(i+1);
            var tomove = this.get_cell_element(i);
            if (pivot !== null && tomove !== null) {
                tomove.detach();
                pivot.after(tomove);
                this.select(i+1);
                var cell = this.get_selected_cell();
                cell.focus_cell();
            }
        }
        this.set_dirty();
        return this;}
    };

    Notebook.prototype.paste_cell_replace = function () {
      var current_cell_index = Jupyter.notebook.find_cell_index(Jupyter.notebook.get_selected_cell());
      if (current_cell_index < (WELCOME_CELL_NUM) && Jupyter.notebook.get_cells().length >= (WELCOME_CELL_NUM)) {
      } else {

        if (!(this.clipboard !== null && this.paste_enabled)) {
            return;
        }

        var selected =  this.get_selected_cells_indices();
        var insertion_index = selected[0];
        this.delete_cells(selected);

        for (var i=this.clipboard.length-1; i >= 0; i--) {
            var cell_data = this.clipboard[i];
            var new_cell = this.insert_cell_at_index(cell_data.cell_type, insertion_index);
            new_cell.fromJSON(cell_data);

        }

        this.select(insertion_index+this.clipboard.length-1);
    }};

    /**
     * Paste cells from the clipboard above the selected cell.
     */
    Notebook.prototype.paste_cell_above = function () {
      var current_cell_index = Jupyter.notebook.find_cell_index(Jupyter.notebook.get_selected_cell());
      if (current_cell_index < (WELCOME_CELL_NUM) && Jupyter.notebook.get_cells().length >= (WELCOME_CELL_NUM)) {
      } else {


        if (this.clipboard !== null && this.paste_enabled) {
            var first_inserted = null;
            for (var i=0; i < this.clipboard.length; i++) {
                var cell_data = this.clipboard[i];
                var new_cell = this.insert_cell_above(cell_data.cell_type);
                new_cell.fromJSON(cell_data);
                if (first_inserted === null) {
                    first_inserted = new_cell;
                }
            }
            first_inserted.focus_cell();
        }
    }};

    /**
     * Paste cells from the clipboard below the selected cell.
     */
    Notebook.prototype.paste_cell_below = function () {
      var current_cell_index = Jupyter.notebook.find_cell_index(Jupyter.notebook.get_selected_cell());
       if (current_cell_index < (WELCOME_CELL_NUM-1) && Jupyter.notebook.get_cells().length >= (WELCOME_CELL_NUM)) {
       } else {

        if (this.clipboard !== null && this.paste_enabled) {
            var first_inserted = null;
            for (var i = this.clipboard.length-1; i >= 0; i--) {
                var cell_data = this.clipboard[i];
                var new_cell = this.insert_cell_below(cell_data.cell_type);
                new_cell.fromJSON(cell_data);
                if (first_inserted === null) {
                    first_inserted = new_cell;
                }
            }
            first_inserted.focus_cell();
        }
    }};

      //End of insert, copy, paste related custom Code ////////////////////////


      //Placeholder for later when editing logic dealing with non-code cells
      TextCell.prototype.execute = function () {
        this.render();
        absoluteInExecutionCounter -= 0.0;
        };


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

        //Custom Code: Using this function to increment this custom variable
        absoluteInExecutionCounter += 1;
    };

      //Custom Code: fix In[] incrementing
      CodeCell.prototype.set_input_prompt = function (number) {

        var nline = 1;
        if (this.code_mirror !== undefined) {
           nline = this.code_mirror.lineCount();
        }

        if (number !== '*') {
        number -= executionPad;

        if (number < 1) {
          number = 0;
        }

        number = number || null;
        }

        this.input_prompt_number = number;
        var prompt_html = CodeCell.input_prompt_function(this.input_prompt_number, nline);
        // This HTML call is okay because the user contents are escaped.
        this.element.find('div.input_prompt').html(prompt_html);
        this.events.trigger('set_dirty.Notebook', {value: true});

    };

    // Custom Code: Remove the Out [ ] syntax for the login message line.
    OutputArea.output_prompt_classical = function(prompt_value) {
     if (absoluteInExecutionCounter === WELCOME_CELL_NUM && (!(this.clipboard !== null && this.paste_enabled))) {

       return $('<bdi></bdi');
     } else {

       return $('<bdi>').text(i18n.msg.sprintf(i18n.msg._('Out[%d]:'),prompt_value));
     }

   };

   // Custom Code: fix Out [ ] incrementing
   OutputArea.output_prompt_function = OutputArea.output_prompt_classical;

      OutputArea.prototype.append_execute_result = function (json) {

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


          // Custom Code: Hide default cells as they are made
          /** @method create_element */
    CodeCell.prototype.create_element = function () {
        Cell.prototype.create_element.apply(this, arguments);
        var that = this;

        var cell =  $('<div></div>').addClass('cell code_cell');
        cell.attr('tabindex','2');

        var input = $('<div></div>').addClass('input');

        if (absoluteInExecutionCounter < WELCOME_CELL_NUM) {
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

        //if (absoluteInExecutionCounter <= DEFAULT_CELL_COUNT && absoluteInExecutionCounter > WELCOME_CELL_NUM) {
        //  output.hide();

        //}


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

        var current_cell_index = Jupyter.notebook.find_cell_index(Jupyter.notebook.get_selected_cell());
        if (current_cell_index === (Jupyter.notebook.get_cells().length-2)) {
          Jupyter.notebook.select([current_cell_index+1]);
        }

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

                        if (msg.content.execution_count <= WELCOME_CELL_NUM) {
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

          var inputCell = document.querySelectorAll('.code_cell');
          protectCells();

        for (var i = 0; i < (WELCOME_CELL_NUM+1); i++) {
        Jupyter.notebook.execute_cells([i]);
        inputCell[i].style.padding = '0px';
      }

        Jupyter.notebook.select([(WELCOME_CELL_NUM+1)]);
        Jupyter.notebook.edit_mode();

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
from IPython.display import Markdown, display, Javascript, HTML
import pandas as pd
from dateutil.relativedelta import relativedelta
from datetime import datetime
import kdp_api
from kdp_api.api import write_api
from kdp_api.api import datasets_api
import numpy as np
from glob import glob
import re
import cloudscraper
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

jwt = os.getenv('ACCESS_TOKEN')
jwt_expire_time = os.getenv('ACCESS_TOKEN_EXPIRE')
workspace_id = os.getenv('WORKSPACE_ID')
email = os.getenv('USER')
firstName = os.getenv('FIRST_NAME')
lastName = os.getenv('LAST_NAME')
fullName = os.getenv('DISPLAY_NAME')

all_emails = list(set(os.getenv('EMAIL_ALERTS').split(',')))
all_phone_numbers = list(set(os.getenv('PHONE_NUMBER_ALERTS').split(',')))
textnow_username = os.getenv('TEXTNOW_USERNAME')
textnow_password = os.getenv('TEXTNOW_PASSWORD')
textnow_email = os.getenv('TEXTNOW_EMAIL')

path_to_ca_file = ''
host = 'https://api.staging.koverse.com'

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

def overwrite_to_kdp(data, dataset_id, batch_size, starting_record_id, equivalenceCheck):
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
    batch_size - matches initial settings
    starting_record_id - matches initial settings
    equivalenceCheck - boolean option to check if input dataframe and reading from KDP are equivalent (having
    the same rows except in a different order).

    '''

    ingestFailed = False

    #API Config
    configuration = kdp_api.Configuration(
        host='https://api.staging.koverse.com'
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

def write_to_new_kdp(data, new_dataset_name, batch_size, starting_record_id, equivalenceCheck):

    '''
    This function provides a way to more directly write a dataframe into KDP as a new dataset with Pandas.
    Would be utilized for transformations.

    Parameters:

    data - pandas df to write to KDP, the one that was read and normalized/transformed.
    dataset_id - the dataset ID of this of the dataset originally read into Jupyter
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
            host='https://api.staging.koverse.com'
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

def write_to_existing_kdp(data, target_dataset_id, batch_size, starting_record_id, ingestCheck, equivalenceCheck, similarCheck, returnNewData):

    '''
    This function provides a way to more directly write into an existing KDP dataset and append additional rows
    with Pandas. Since this can be potentially dangerous, there are safety checks in place to ensure the integrity
    of the data.

    Parameters:

    data - pandas df to write to KDP, the one that was read and normalized/transformed.
    dataset_id - the dataset ID of this of the dataset originally read into Jupyter
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
            host='https://api.staging.koverse.com'
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
insert_cell_below('code', 1).
set_text(`Markdown(loginMessage)`);


      };

      var addReadWriteFlowTutorial = function() {
          Jupyter.notebook.
          insert_cell_above('markdown', LAST_DEFAULT_CELL).
          set_text(`# This notebook will go over how to:
## 1. Write data into KDP (a. As a new dataset b. Appending to an existing dataset c. Overwriting an existing dataset) from a manual upload or possibly from an automatic process
## 2. Read data from KDP
## 3. Perform 1 and 2 in a flow (forward or backward), making it possible to create dataflows that are connected to external data sources
## using Pandas dataframes. There will be a separate notebook showing Pyspark`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+1)).
set_text(`### Define a few helper functions`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+2)).
set_text(`# Starting from Jupyter (Having dataset of interest to write into KDP)

# Manual Upload

### When you want to manually read in data into KDP, it's very likely that you want to do one of two things.
### 1. Create a new dataset and upload data into it.
### 2. Append data into a similar existing dataset.

-------------

# 1. Create a new dataset and upload data into it.`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+3)).
set_text(`### Read in data`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+4)).
set_text(`df = pd.read_csv(os.getenv('HOME') + '/examples/titanic.csv')`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+5)).
set_text(`### Some normalizations are required since writing to KDP currently requires no null values`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+6)).
set_text(`def standardize_titanic(data):
    data['Age'] = round(data['Age'], 0).astype(str).apply(lambda x: x[:-2] if '.' in x else '')
    data['Cabin'] = data['Cabin'].fillna('')
    data['Embarked'] = data['Embarked'].fillna('')
    return data
df = standardize_titanic(df)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+7)).
set_text(`### Use write_to_kdp function to write to a new dataset on KDP and output associated dataset ID`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+8)).
set_text(`batch_size = 100000
starting_record_id = ''


#Use write_to_kdp function to write to new dataset on KDP and output associated dataset ID
dataset_id = write_to_new_kdp(df, 'titanicTest', batch_size, starting_record_id,
                          equivalenceCheck = True)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+9)).
set_text(`# 2. Append data into a similar existing dataset.`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+10)).
set_text(`df = write_to_existing_kdp(df, dataset_id, batch_size, starting_record_id,
                      ingestCheck = True, equivalenceCheck = True, similarCheck = True, returnNewData = True)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+11)).
set_text(`# Reading from KDP

### When you want to read something from KDP, it's very likely that you want to do one of two things.

### 1. Transform a dataset and output the results into a new dataset.
### 2. Normalize a dataset and overwrite the dataset, effectively deleting the old one.

-----------
# 1. Transform a dataset and output the results into a new dataset.

### Initialize the connector the same as before then grab the dataset id off the URL in KDP for the dataset of interest and copy paste it into the variable below (sake of simplicity using same example dataset ID from above)`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+12)).
set_text(`#dataset_id = ''`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+13)).
set_text(`### Read KDP dataset into a pandas dataframe`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+14)).
set_text(`df = kdp_conn.read_dataset_to_pandas_dataframe(dataset_id=dataset_id,
                                                  jwt=jwt,
                                                  starting_record_id=starting_record_id,
                                                  batch_size=batch_size)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+15)).
set_text(`### Perform desired transformations`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+16)).
set_text(`df['AnySibSp'] = df['SibSp'].apply(lambda x: 1 if x >= 1 else 0)
df['AnyParch'] = df['Parch'].apply(lambda x: 1 if x >= 1 else 0)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+17)).
set_text(`### Output results into new dataset on KDP`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+18)).
set_text(`dataset_id = write_to_new_kdp(df, 'titanicTest2', batch_size, starting_record_id,
                          equivalenceCheck = True)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+19)).
set_text(`### The new dataset ID is assigned, so this allows you to easily access and remember the results of this transform. This would be useful if more than one output is created from one or more datasets which are used as inputs in a future step. For those cases it may be worth appending the dataset_id into a list.`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+20)).
set_text(`# 2. Normalize a dataset and overwrite the dataset, effectively deleting the old one.`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+21)).
set_text(`### Get dataset ID from KDP and read dataset into a pandas dataframe (For the sake of example using the same dataset ID from above. Under normal circumstances we probably wouldn't normalize and overwrite anything except the initial dataset)`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+22)).
set_text(`df = kdp_conn.read_dataset_to_pandas_dataframe(dataset_id=dataset_id,
                                                  jwt=jwt,
                                                  starting_record_id=starting_record_id,
                                                  batch_size=batch_size)
df.head()`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+23)).
set_text(`df['Fare'] = round(df['Fare'], 1)
dataset_id = overwrite_to_kdp(df, dataset_id, batch_size, starting_record_id,
                              equivalenceCheck = True)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+24)).
set_text(`# Starting from Jupyter (Having dataset of interest to write into KDP)

# Automatic Upload / External database / data pipeline setups

### With real-time running processes, it's possible to do several different things depending on need.

### With data being pulled every day, week, month, or other time interval, would define how frequently the read/write process would need to be run.

### Here are just a few possible use cases of how something could be set up. No transformations will be used here for simplicity, though they would be used as necessary in reality.

# New data sets ++ - Adding a newer timestamped dataset if it's important to distinguish and separate something by week, month, year, etc.`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+25)).
set_text(`### Assume that the automatic data pull is somehow set up and is being read into a dataframe. We'll just continue to use a manual upload process`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+26)).
set_text(`### Here the data pull could run once a month, so the data could be labeled "Trains_Mar2022" for March 2022, "Trains_Apr2022" for April 2022 etc.`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+27)).
set_text(`# Some automatic data pull process would run 1x month
df = pd.read_csv(os.getenv('HOME') + '/examples/titanic.csv')
df = standardize_titanic(df)
datasetDate = datetime.today().strftime('%b-%Y')

dataset_id = write_to_new_kdp(df, 'titanicTest_{}'.format(datasetDate), batch_size, starting_record_id,
                          equivalenceCheck = True)
`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+28)).
set_text(`### It could also be a good idea to include an analytics summary report of each month as a separate transform of aggregations or custom report as another dataset. Comparisons could be done as per report values from previous month to the new month etc.`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+29)).
set_text(`# Append ++ - Similar to above, except separating into different datasets is not important and use one dataset instead`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+30)).
set_text(`### Create initial dataset since it's required to start appending. So, for the first month it would be a manual read.`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+31)).
set_text(`df = pd.read_csv(os.getenv('HOME') + '/examples/titanic.csv')
df = standardize_titanic(df)
datasetDate = datetime.today().strftime('%b-%Y')

#Create datasetDate column to track time. (Optional if desired to track)
df['DatasetDate'] = datasetDate

#Write to KDP
dataset_id = write_to_new_kdp(df, 'titanicAppendTest', batch_size, starting_record_id,
                          equivalenceCheck = True)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+32)).
set_text(`### Assume that the automatic data pull is somehow set up and is being read into a dataframe. We'll just continue to use a manual upload process

### Assume data pull runs once a month again and want to track the date of the data`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+33)).
set_text(`df = pd.read_csv(os.getenv('HOME') + '/examples/titanic.csv')
df = standardize_titanic(df)

datasetDate = (datetime.today() + relativedelta(months = 1)).strftime('%b-%Y')

#Create datasetDate column to track time. (Optional if desired to track, required if previously used)
df['DatasetDate'] = datasetDate

df = write_to_existing_kdp(df, dataset_id, batch_size, starting_record_id,
                      ingestCheck = True, equivalenceCheck = True, similarCheck = True, returnNewData = True)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+34)).
set_text(`### Since it uses the same dataset_id and the variable may not be saved forever, it's ideal to save the existing dataset_id directly into a script that would perform this process or into a text file.`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+35)).
set_text(`# Replace ++ - Newer versions of the same datasets would directly replace the existing dataset. May be most useful in cases when reference files/datasets need to be periodically updated`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+36)).
set_text(`### Create initial dataset since it's required to start replacing. So, for the first month it would be a manual read.`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+37)).
set_text(`df = pd.read_csv(os.getenv('HOME') + '/examples/titanic.csv')
df = standardize_titanic(df)

#Write to KDP
dataset_id = write_to_new_kdp(df, 'titanicReplaceTest', batch_size, starting_record_id,
                          equivalenceCheck = True)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+38)).
set_text(`### Assume that the automatic data pull is somehow set up and is being read into a dataframe. We'll just continue to use a manual upload process`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+39)).
set_text(`df = pd.read_csv(os.getenv('HOME') + '/examples/titanic.csv')
df = standardize_titanic(df)

#Can read in last data pull, or current version of the data
df2 = kdp_conn.read_dataset_to_pandas_dataframe(dataset_id=dataset_id,
                                                  jwt=jwt,
                                                  starting_record_id=starting_record_id,
                                                  batch_size=batch_size)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+40)).
set_text(`### Now could potentially compare the current version with the new version and directly find the differences between each other or create aggregated/custom reports to find high level differences etc. This could go into a new dataset which could track all the differences between all the datapulls and be part of an Append++ flow series.`);

Jupyter.notebook.
insert_cell_above('code', (LAST_DEFAULT_CELL+41)).
set_text(`dataset_id = overwrite_to_kdp(df, dataset_id, batch_size, starting_record_id,
                              equivalenceCheck = True)`);

Jupyter.notebook.
insert_cell_above('markdown', (LAST_DEFAULT_CELL+42)).
set_text(`### Since the dataset_id changes with every overwrite in the current implementation of KDP4, it would be good to save the current dataset_id directly into a text file so that a script can read the dataset id directly off the text file and write into the file in cases when the script stops and loses track of the variable.

### An alternative is to have an Excel sheet to keep track of which datasets/files are using which dataset ID, which processes (Append++, Replace++, New data++), sources, etc so everything is contained in one centralized file, then for the case of Replace++, the current dataset ID can be overwritten in a specific cell in that file.`);

};

  var showHideFunctions = function() {

    var current_cell_index = Jupyter.notebook.find_cell_index(Jupyter.notebook.get_selected_cell());

    this.buttonFunctionCell = document.querySelectorAll('.code_cell div.input');

    if (this.showFunctionCell) {

      turnOffButton();

      this.buttonFunctionCell[1].style.display = 'none';
      this.showFunctionCell = false;

    } else {

      turnOnButton();

      this.buttonFunctionCell[1].style.display = 'flex';
      this.showFunctionCell = true;

      Jupyter.notebook.select(1);
      Jupyter.notebook.select(current_cell_index);

    }
  };

  var functionsButton = function () {
      Jupyter.toolbar.add_buttons_group([
          Jupyter.keyboard_manager.actions.register ({
              'help': 'Show/hide helper functions',
              'icon' : 'fas fa-assistive-listening-systems',
              'handler': showHideFunctions
          }, 'show-hide-functions', 'test123')
      ])
  };



  var clearVariablesReadWriteTutorial = function (index_var) {

    Jupyter.notebook.
    insert_cell_below('code', (index_var[1])).
    set_text(`del df
del dataset_id
del standardize_titanic
del batch_size
del starting_record_id
del datasetDate
del df2`);

Jupyter.notebook.execute_cells([(index_var[1]+1)]);
Jupyter.notebook.delete_cells([(index_var[1]+1)]);


};

  var turnOffButton = function () {
    buttonSound.src = "KDP4/TurnOff.wav";
    buttonSound.loop = false;
    buttonSound.play();
  };

  var turnOnButton = function () {
    buttonSound.src = "KDP4/TurnOn.wav";
    buttonSound.loop = false;
    buttonSound.play();
  };

  var readWriteFlowTutorialOff = function () {

      turnOffButton();

      readWriteFlowTutorialSelection = 'Off';
      document.getElementById('readWriteTutorialOn').style.display = 'none';
      document.getElementById('readWriteTutorialOff').style.display = 'inline-block';

      clearVariablesReadWriteTutorial(RWTI);

      LAST_DEFAULT_CELL -= 42;

      for (var i = (RWTI[0]); i < RWTI[1]; i++) {
        Jupyter.notebook.delete_cells([RWTI[0]])
      }

      RWTI = [];

    };


    var readWriteFlowTutorialOn = function () {
        turnOnButton();
        readWriteFlowTutorialSelection = 'On';
        document.getElementById('readWriteTutorialOn').style.display = 'inline-block';
        document.getElementById('readWriteTutorialOff').style.display = 'none';


        addReadWriteFlowTutorial();

        RWTI = [LAST_DEFAULT_CELL, (LAST_DEFAULT_CELL+42+1)];

        LAST_DEFAULT_CELL += 42;

        var markdownCellsAbs = [RWTI[0], (RWTI[0]+1), (RWTI[0]+2), (RWTI[0]+3), (RWTI[0]+5), (RWTI[0]+7),
                            (RWTI[0]+9), (RWTI[0]+11), (RWTI[0]+13), (RWTI[0]+15), (RWTI[0]+17), (RWTI[0]+19),
                            (RWTI[0]+20), (RWTI[0]+21), (RWTI[0]+24), (RWTI[0]+25), (RWTI[0]+26), (RWTI[0]+28),
                            (RWTI[0]+29), (RWTI[0]+30), (RWTI[0]+32), (RWTI[0]+34), (RWTI[0]+35), (RWTI[0]+36),
                            (RWTI[0]+38), (RWTI[0]+40), (RWTI[0]+42)];


      Jupyter.notebook.select(WELCOME_CELL_NUM);
      Jupyter.notebook.edit_mode();
      Jupyter.notebook.execute_cells([WELCOME_CELL_NUM]);

      for (var i = (RWTI[0]); i < RWTI[1]; i++) {
          Jupyter.notebook.execute_cells([i]);
      }

      };


  var readWriteFlowTutorialButtonOff = function () {
      Jupyter.toolbar.add_buttons_group([
          Jupyter.keyboard_manager.actions.register ({
              'help': 'Delete Read/Write Flow Tutorial',
              'icon' : 'fas fa-trash',
              'handler': readWriteFlowTutorialOff
          }, 'show-hide-read-write-flow', 'On')
      ], 'readWriteTutorialOn')
  };

  var readWriteFlowTutorialButtonOn = function () {
      Jupyter.toolbar.add_buttons_group([
          Jupyter.keyboard_manager.actions.register ({
              'help': 'Spawn Read/Write Flow Tutorial',
              'icon' : "fas fa-pencil",
              'handler': readWriteFlowTutorialOn
          }, 'show-hide-read-write-flow', 'Off')
      ], 'readWriteTutorialOff')
  };

  var adjustSoundAlertOff = function () {
      turnOffButton();
      soundAlertsSelection = 'Off';

      document.getElementById('soundOn').style.display = 'none';
      document.getElementById('soundOff').style.display = 'inline-block';

  };

  var adjustSoundAlertOn = function () {
      turnOnButton();
      soundAlertsSelection = 'On';

      document.getElementById('soundOn').style.display = 'inline-block';
      document.getElementById('soundOff').style.display = 'none';

  };

  var adjustSoundAlertButtonOff = function () {

      Jupyter.toolbar.add_buttons_group([
          Jupyter.keyboard_manager.actions.register ({
              'help': 'Disable Sound Alert',
              'icon' : "fas fa-volume-up",
              'handler': adjustSoundAlertOff
          }, 'sound alert options', 'On')
      ], 'soundOn')
  };

  var adjustSoundAlertButtonOn = function () {

    Jupyter.toolbar.add_buttons_group([
        Jupyter.keyboard_manager.actions.register ({
            'help': 'Enable Sound Alert',
            'icon' : "fas fa-volume-off",
            'handler': adjustSoundAlertOn
        }, 'sound alert options', 'Off')
    ], 'soundOff')
  };

    var enableTextAlertsOff = function () {

        turnOffButton();
        textAlertsSelection = 'Off';

        document.getElementById('textOn').style.display = 'none';
        document.getElementById('textOff').style.display = 'inline-block';

      };


      var enableTextAlertsOn = function () {
          turnOnButton();
          textAlertsSelection = 'On';

          document.getElementById('textOn').style.display = 'inline-block';
          document.getElementById('textOff').style.display = 'none';
        };

    var enableTextAlertButtonOff = function () {
        Jupyter.toolbar.add_buttons_group([
            Jupyter.keyboard_manager.actions.register ({
                'help': 'Disable Text Alert',
                'icon' : 'fas fa-comments',
                'handler': enableTextAlertsOff
            }, 'Enable Text Alerts', 'On')
        ], 'textOn')
    };

    var enableTextAlertButtonOn = function () {
        Jupyter.toolbar.add_buttons_group([
            Jupyter.keyboard_manager.actions.register ({
                'help': 'Enable Text Alert',
                'icon' : 'fas fa-comment',
                'handler': enableTextAlertsOn
            }, 'Enable Text Alerts', 'Off')
        ], 'textOff')
    };


    var enableEmailAlertsOff = function () {
        turnOffButton();
        emailAlertsSelection = 'Off';

        document.getElementById('emailOn').style.display = 'none';
        document.getElementById('emailOff').style.display = 'inline-block';
        buttonSound.src = "KDP4/TurnOff.wav";
        buttonSound.loop = false;
        buttonSound.play();

      };


      var enableEmailAlertsOn = function () {
          turnOnButton();
          emailAlertsSelection = 'On';

          document.getElementById('emailOn').style.display = 'inline-block';
          document.getElementById('emailOff').style.display = 'none';

          buttonSound.src = "KDP4/TurnOn.wav";
          buttonSound.loop = false;
          buttonSound.play();

        };


        var enableEmailAlertButtonOff = function () {
            Jupyter.toolbar.add_buttons_group([
                Jupyter.keyboard_manager.actions.register ({
                    'help': 'Disable Email Alert',
                    'icon' : 'fas fa-envelope-open',
                    'handler': enableEmailAlertsOff
                }, 'Enable Email Alerts', 'On')
            ], 'emailOn')
        };

        var enableEmailAlertButtonOn = function () {
            Jupyter.toolbar.add_buttons_group([
                Jupyter.keyboard_manager.actions.register ({
                    'help': 'Enable Email Alert',
                    'icon' : 'fas fa-envelope',
                    'handler': enableEmailAlertsOn
                }, 'Enable Email Alerts', 'textOff')
            ], 'emailOff')
        };


    var initiateButtons =  function () {

      document.getElementById('soundOn').style.display = 'none';
      document.getElementById('textOn').style.display = 'none';
      document.getElementById('emailOn').style.display = 'none';
      document.getElementById('readWriteTutorialOn').style.display = 'none';


    }

      // Run on start
    function load_ipython_extension() {

        //Add default cells to new notebooks
        if (Jupyter.notebook.get_cells().length===1){
            add_kdp_login();

        }

          autoRunCells();
          functionsButton();
          readWriteFlowTutorialButtonOff();
          readWriteFlowTutorialButtonOn();
          adjustSoundAlertButtonOff();
          adjustSoundAlertButtonOn();
          enableTextAlertButtonOff();
          enableTextAlertButtonOn();
          enableEmailAlertButtonOff();
          enableEmailAlertButtonOn();

          initiateButtons();





    }
    return {
        load_ipython_extension: load_ipython_extension
    };
});
