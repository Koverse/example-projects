KDP4 Grafana

* Build userinfo docker container: `cd user-info-server && docker build -t koverse/userinfo . `
* Start docker compose `docker-compose up`

Login

Default Username: admin
Default Password: admin

### Hands-on Tutorial: Connecting Koverse Data Platform (KDP) with Grafana

In this tutorial, we'll walk through the process of connecting the Koverse Data Platform (KDP) with Grafana, a popular data visualization tool, to create interactive visualizations from KDP datasets.

**Prerequisites:**

- Access to a Koverse Data Platform instance
- Grafana installed and running (version 7.x or newer)
- Grafana Infinity Datasource plugin installed

**Step 1: Configure the Grafana Infinity Datasource**

1. Open Grafana in your web browser and log in using your credentials.
2. Click on the gear icon (Configuration) on the left side of the screen.
3. In the Configuration menu, click on "Data sources."
4. Click on the "Add data source" button and search for "Infinity." Select the Infinity Datasource plugin from the list.
5. Configure the Infinity Datasource by providing a name and selecting "JSON" as the Data Format.

**Step 2: Create a new Grafana Dashboard**

1. Click on the "+" icon (Create) on the left side of the screen.
2. Select "Dashboard" to create a new dashboard.
3. Click on "Add an empty panel."

**Step 3: Configure the Panel to Use KDP Data**

1. In the panel editor, set the Data source to the Infinity Datasource you configured in Step 1.
2. Set the Type to "JSON."
3. Set the Source to "URL."
4. Enter the KDP API query URL in the following format: `https://<kdp_instance_url>/query`
5. Click on the "Http Method, Query param, Headers" button.
6. Select the appropriate HTTP method (e.g., POST) and enter the API request body containing the query.

Example API request body:

```json
{
  "datasetId": "<dataset_id>",
  "expression": "SELECT * FROM \"<dataset_id>\" WHERE \"field\" > value",
  "limit": 200,
  "offset": 0
}
```

7. In the Headers tab, add a custom header for Authorization.

Example Header:

Key: `Authorization`
Value: `Bearer <your_koverse_access_token>`

**Step 4: Configure the Data Visualization**

1. In the panel editor, set the Rows / Root path to "records."
2. Configure the Columns by mapping KDP dataset fields to Grafana columns. Use the "Selector" to choose the field in the KDP dataset and provide a display name for the Grafana table.
3. Set the data type for each column in the "format as" dropdown.

**Step 5: Save and View the Dashboard**

1. Once you've finished configuring the panel, click on the "Apply" button to save the changes.
2. Close the panel editor and view your new Grafana dashboard with KDP data.

Now you have successfully connected KDP to Grafana and created a dashboard with an interactive visualization using KDP data. You can create more panels and visualizations by following the same steps, exploring different datasets and visualization types to gain insights from your KDP data.
