import React from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/styles";
import MenuAppBar from '../MenuAppBar/MenuAppBar';

const styles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
  },
  main: {
    flexGrow: 1,
  },
  toolbar: { ...theme.mixins.toolbar },
}));

const Page = ({ children }) => {
  const classes = styles();
  return (
    <>
      <MenuAppBar/>
      <div className={classes.root}>
      <div className={classes.toolbar} />
      <main className={classes.main}>{children}</main>
    </div>
    </>

  );
};

Page.propTypes = {
  children: PropTypes.node,
};

export default Page;
