import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListSubheader from "@material-ui/core/ListSubheader";
import Chip from "@material-ui/core/Chip";
import EncountersFilter from "./EncountersFilter";
import moment from "moment";
import { Timeline } from "antd";
import "antd/dist/antd.css";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Box from "@material-ui/core/Box";

const useStyles = makeStyles((theme) => ({
  listTitle: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  root: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: theme.palette.background.paper,
  },
  listSubheader: {
    background: theme.palette.background.paper,
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
  },
  nested: {
    paddingLeft: theme.spacing(4),
  },
}));

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box p={0}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

function a11yProps(index) {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
  };
}

const EncountersList = ({
  data,
  organizations,
  modifyDataCallback,
  viewJourneysCallback,
  setSearchBarContext,
  setOrganizationArcs,
}) => {
  const classes = useStyles();
  const [filteredData, setFilteredData] = React.useState(data);
  const [filteredOrgs, setFilteredOrgs] = React.useState(organizations);
  const [filterArray, setFilterArray] = React.useState([]);
  const [selected, setSelected] = React.useState("");
  const [selectedOrg, setSelectedOrg] = React.useState({ id: "", name: "" });
  const [value, setValue] = React.useState(0);

  const handlePatientClick = (data) => {
    if (selected === data) {
      setSelected("");
      modifyDataCallback("");
    } else {
      setSelected(data);
      modifyDataCallback(data);
    }
  };

  const handleJourneyClick = (patientID, journeyID) => {
    console.log(patientID, journeyID);
    if (selected === patientID) {
      setSelected("");
      modifyDataCallback("");
    } else {
      setSelected(patientID);
      viewJourneysCallback(patientID, journeyID);
    }
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const clearSelection = () => {
    setSelected("");
    modifyDataCallback("");
  };

  React.useEffect(() => {
    // Set map by filtered Data?
    // console.log(filteredData)
    console.log(filterArray);
    setSearchBarContext(filterArray);
  }, [filteredData]);

  const setActiveOrganization = (organization) => {
    console.log(organization, selectedOrg);
    if (selectedOrg.id !== "") {
      setSelectedOrg({ id: "", name: "" });
      setOrganizationArcs("");
    } else {
      setSelectedOrg({ id: organization.id, name: organization.name });
      setOrganizationArcs(organization.id);
    }
  };

  return (
    <span>
      <List
        subheader={
          <ListSubheader className={classes.listSubheader} component="div">
            {/* <Typography variant="h5">Patient Journeys</Typography> */}
            <EncountersFilter
              data={data}
              organizations={organizations}
              setFilteredOrgs={setFilteredOrgs}
              setData={setFilteredData}
              setFilterArray={setFilterArray}
            />
            {selected !== "" && (
              <Chip
                label={selected}
                onDelete={clearSelection}
                variant="outlined"
              />
            )}

            {selectedOrg.id !== "" && (
              <Chip
                label={selectedOrg.name}
                onDelete={() => setActiveOrganization({ name: "", id: "" })}
                variant="outlined"
              />
            )}

            <Tabs
              value={value}
              onChange={handleChange}
              indicatorColor="primary"
              textColor="secondary"
              variant="standard"
              aria-label="full width tabs example"
            >
              <Tab label="Organizations" {...a11yProps(0)} />
              <Tab label="Patients" {...a11yProps(1)} />
            </Tabs>
          </ListSubheader>
        }
        className={classes.root}
      >
        <TabPanel value={value} index={0}>
          {filteredOrgs.map((organization) => {
            return (
              <span
                key={organization.id}
                onClick={() => setActiveOrganization(organization)}
              >
                <ListItem dense selected={organization.id === selectedOrg.id}>
                  <ListItemText primary={organization.name} />
                </ListItem>
                <ListItem dense selected={organization.id === selectedOrg.id}>
                  <ListItemText secondary={organization.address} />
                </ListItem>
                <ListItem dense selected={organization.id === selectedOrg.id}>
                  <ListItemText
                    secondary={`Inbound Transfers: ${organization.inbound}`}
                  />
                </ListItem>
                <ListItem
                  dense
                  divider
                  selected={organization.id === selectedOrg.id}
                >
                  <ListItemText
                    secondary={`Outbound Transfers: ${organization.outbound}`}
                  />
                </ListItem>
              </span>
            );
          })}
          {filteredOrgs.length === 0 && (
            <ListItem dense>
              <ListItemText primary="No organizations found." />
            </ListItem>
          )}
        </TabPanel>

        <TabPanel value={value} index={1}>
          {Object.keys(filteredData).map((patientID) => {
            const object = filteredData[patientID];
            /* eslint-disable*/
            return (
              <span>
                <ListItem
                  button
                  divider
                  selected={patientID === selected}
                  key={patientID}
                  onClick={(e, data) => handlePatientClick(patientID)}
                >
                  <ListItemText primary={patientID} />
                </ListItem>
                {Object.keys(object).map((journeyID, index) => {
                  let journeys = object[journeyID];
                  return (
                    <span>
                      <ListItem
                        button
                        onClick={(e, data) =>
                          handleJourneyClick(patientID, journeyID)
                        }
                      >
                        <ListItemText
                          primary={`${moment(journeys[0].START).format(
                            "MM/DD/YYYY"
                          )} - ${moment(
                            journeys[journeys.length - 1].START
                          ).format("MM/DD/YYYY")}`}
                        />
                      </ListItem>
                      <ListItem>
                        <Timeline>
                          {journeys.map((step, index) => {
                            return (
                              <span>
                                <Timeline.Item color="gray">
                                  {step.FROM_NAME} <br />
                                  {step.COND_DESC} <br />
                                  {moment(step.START).format(
                                    "MM/DD/YYYY HH:mm"
                                  )}
                                </Timeline.Item>

                                <Timeline.Item color="gray">
                                  {step.NEXT_NAME} <br />
                                  {step.COND_DESC} <br />
                                  {moment(step.START).format(
                                    "MM/DD/YYYY HH:mm"
                                  )}
                                </Timeline.Item>
                              </span>
                            );
                          })}
                        </Timeline>
                      </ListItem>
                    </span>
                  );
                })}
              </span>
            );
          })}
          {Object.keys(filteredData).length === 0 && (
            <ListItem dense>
              <ListItemText
                primary={"No patients found for filter parameters."}
              />
            </ListItem>
          )}
        </TabPanel>
      </List>
    </span>
  );
};

EncountersList.propTypes = {
  data: PropTypes.array,
  organizations: PropTypes.array,
  modifyDataCallback: PropTypes.func,
  viewJourneysCallback: PropTypes.func,
  setSearchBarContext: PropTypes.func,
  setOrganizationArcs: PropTypes.func,
};

EncountersList.defaultProps = {
  data: [],
};

export default EncountersList;
