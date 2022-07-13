KDP4 Grafana

* Build userinfo docker container: `cd user-info-server && docker build -t koverse/userinfo . `
* Start docker compose `docker-compose up`

Login

Default Username: admin
Default Password: admin

Enter in replacement password (putting admin back in will still work)

On left side of screen look for the “gear” icon, click on it.

In the “Configuration” screen, click on the “Plugins” tab

Enter “infinity” in the search box, click on the “infinity” plugin box

On the Plugins/Infinity page, click the “install” button

Hover over the “plus” sign on the left side of the screen
	Press “Create” if you want to make a new panel from the ground up following the steps below
	Press “Import” and select the “dashboard.json” in the project files if you want to import an example

Click “Add a new panel” box

Datasource: 
Infinity Plugin

Type:
JSON

Source:
URL

Format:
Table

Example url:

https://api.app.koverse.com/query

Click on the “Http Method, Query param, Headers” button

In the right side dialog, select the “Method” that matches your API call

Place the body of the API request in the text box below it.

Example Bodies:

#1 
{
      "datasetId": "c83a25f3-26ff-487c-a5cf-b9ba6301d518",
      "expression": "SELECT * FROM \"c83a25f3-26ff-487c-a5cf-b9ba6301d518\" where \"flight_aware_ts\" > 1651770919046",
      "limit": 200,
      "offset": 0
}

#2 (contains Grafana global variables)
{
      "datasetId": "c83a25f3-26ff-487c-a5cf-b9ba6301d518",
      "expression": "SELECT * FROM \"c83a25f3-26ff-487c-a5cf-b9ba6301d518\" where \"flight_aware_ts\" > ${__from:date:seconds}",
      "limit": 2000,
      "offset": 0
}

In the right side dialog, select the “Headers” tab

Add a custom header

Example Header

Key: Authorization

Value: eyJhbGciOiJIUzI1NiIsInR5cCI6ImFjY2VzcyJ9.eyJlbWFpbCI6Im5hdGhhbnRpc2RhbGVkb2xsYWhAa292ZXJzZS5jb20iLCJpYXQiOjE2NTE2OTIwNDUsImV4cCI6MTY1MTc3ODQ0NSwiaXNzIjoia292ZXJzZSIsInN1YiI6IjI1YWYzNTlmLTkwOWYtNGVlMS04NzE4LTYyZDczZWFkNDY0YyIsImp0aSI6IjQyMjliNzdkLWYyZTQtNGRiYS04OWNlLTZkY2QzNWJiYzMyMyJ9.AzEF73ucd-qK8IOkYWHdQJKiHxkKThGnn7Cz_2WD5GE

(Pull the “value” from KDP4, 
right click on the page and select “Inspect Element” 
select the “Application” tab
Look on the left side and click on “Cookies” to open up the drop down
Select the cookie matching the name of the KDP4 site
Look for “koverse-jwt” on the right side table
Copy the value and that will be what you place in the header)


Example Rows / Roots: 
records

Columns:
(These will be the fields you want to display in the dashboard)
(Selector is the name of the record in KDP4)
(The second box after “as” is the name you’ll be using for the table display)
(The dropdown box after “format as” is the typing of the record field in KDP4 and how Grafana will treat the columns in the record)

Once you’ve finished adding and customizing all the fields above, click on the “Query Inspector” button on the right side of the area where you selected the “Datasource” type. 
(If you don’t see it, the query box underneath the panel visual is actually scrollable, so you may have scrolled past it and hidden it from yourself) 

In the right side dialog hit the “refresh” button

You should now see the results of your query.

If you back out of the query and look at your panel, you should either see the results of your query being displayed in the panel or it will ask that you alter your columns to add a type of data, such as a time column or number column, adjust accordingly. 