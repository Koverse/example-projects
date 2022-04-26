import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/core/styles";
import Drawer from "@material-ui/core/Drawer";
import Toolbar from "@material-ui/core/Toolbar";
import EncountersList from "./EncountersList";

const drawerWidth = 375;

const useStyles = makeStyles(() => ({
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
  },
  drawerPaper: {
    width: drawerWidth,
  },
  drawerContainer: {
    overflow: "auto",
  },
}));

const EncountersDrawer = ({
  data,
  organizations,
  modifyDataCallback,
  viewJourneysCallback,
  setSearchBarContext,
  setOrganizationArcs,
}) => {
  const classes = useStyles();

  return (
    <Drawer
      className={classes.drawer}
      variant="permanent"
      classes={{
        paper: classes.drawerPaper,
      }}
    >
      <Toolbar />
      <div className={classes.drawerContainer}>
        <EncountersList
          data={data}
          organizations={organizations}
          modifyDataCallback={modifyDataCallback}
          viewJourneysCallback={viewJourneysCallback}
          setSearchBarContext={setSearchBarContext}
          setOrganizationArcs={setOrganizationArcs}
        />
      </div>
    </Drawer>
  );
};

EncountersDrawer.propTypes = {
  data: PropTypes.object,
  organizations: PropTypes.array,
  modifyDataCallback: PropTypes.func,
  viewJourneysCallback: PropTypes.func,
  setSearchBarContext: PropTypes.func,
  setOrganizationArcs: PropTypes.func,
};

export default EncountersDrawer;
