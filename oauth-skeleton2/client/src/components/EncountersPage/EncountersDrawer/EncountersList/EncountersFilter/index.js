import React from "react";
import PropTypes from "prop-types";
import { get, debounce } from "lodash";
import TextField from "@material-ui/core/TextField";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import Grid from "@material-ui/core/Grid";
import Input from "@material-ui/core/Input";
import { MuiPickersUtilsProvider, DatePicker } from "@material-ui/pickers";
import MomentUtils from "@date-io/moment";
import moment from "moment";
import Fuse from "fuse.js";

const stateHash = {
  AL: "Alabama",
  AK: "Alaska",
  AS: "American Samoa",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District Of Columbia",
  FM: "Federated States Of Micronesia",
  FL: "Florida",
  GA: "Georgia",
  GU: "Guam",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MH: "Marshall Islands",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  MP: "Northern Mariana Islands",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PW: "Palau",
  PA: "Pennsylvania",
  PR: "Puerto Rico",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VI: "Virgin Islands",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const EncountersFilter = ({
  data,
  organizations,
  setFilteredOrgs,
  setData,
  setFilterArray,
}) => {
  const [term, setTerm] = React.useState("");
  const [searchIndex, setSearchIndex] = React.useState([]);
  const [condition, setCondition] = React.useState("all");
  const [conditions, setConditions] = React.useState([
    {
      value: "126906006",
      label: "Neoplasm of Prostate",
    },
  ]);
  const [startDate, setStartDate] = React.useState(null);
  const [endDate, setEndDate] = React.useState(null);

  const fuse = new Fuse(searchIndex, {
    threshold: 0.1,
    location: 0,
    distance: 100,
    maxPatternLength: 64,
    minMatchCharLength: 2,
    keys: [
      "NEXT_STATE",
      "FROM_STATE",
      "NEXT_CITY",
      "FROM_CITY",
      "NEXT_NAME",
      "FROM_NAME",
      "stateUnabbreviated",
    ],
  });

  React.useEffect(() => {
    const addToSearchIndex = [];
    const conditionsMap = {};
    Object.keys(data).forEach((d) => {
      const patient = data[d];
      Object.keys(patient).forEach((journey) => {
        const encounters = patient[journey];
        encounters.forEach((encounter) => {
          conditionsMap[encounter.COND_CODE] = conditionsMap[
            encounter.COND_CODE
          ] || { value: encounter.COND_CODE, label: encounter.COND_DESC };

          encounter.stateUnabbreviated = stateHash[encounter.NEXT_STATE];
          addToSearchIndex.push(encounter);
        });
      });
    });

    const conditionsArray = Object.keys(conditionsMap).map((condition) => {
      return conditionsMap[condition];
    });

    conditionsArray.unshift({ value: "all", label: "All Conditions" });

    setConditions(conditionsArray);

    // console.log(conditionsMap)
    setSearchIndex(addToSearchIndex);
  }, [data]);

  const handleChange = (event) => {
    setCondition(event.target.value);
  };

  const handleStartDateChange = (date) => {
    console.log(date);

    setStartDate(date);
  };

  const handleEndDateChange = (date) => {
    console.log(date);

    setEndDate(date);
  };

  const debounceSet = debounce(setTerm, 500);

  React.useEffect(() => {
    const returnObject = {};

    const filteredArray = [];
    // console.log(data)
    Object.keys(data).forEach((d) => {
      const patient = data[d];
      Object.keys(patient).forEach((journey) => {
        const encounters = patient[journey];
        encounters.forEach((encounter) => {
          // Date Filtering
          if (
            moment(encounter.START).isSameOrAfter(startDate) &&
            moment(encounter.STOP).isSameOrBefore(endDate)
          ) {
            filteredArray.push(d);
          }
        });
      });
      // return d.toLowerCase().includes(term)
    });

    filteredArray.forEach((resultID) => {
      returnObject[resultID] = data[resultID];
    });

    const uniqueArray = Object.keys(returnObject).map((key) => key);

    setFilterArray(uniqueArray);

    // console.log(results)
    setData(returnObject);
  }, [startDate, endDate]);

  React.useEffect(() => {
    console.log(condition);
    const returnObject = {};

    const filteredArray = [];
    // console.log(data)
    Object.keys(data).forEach((d) => {
      const patient = data[d];
      Object.keys(patient).forEach((journey) => {
        const encounters = patient[journey];
        encounters.forEach((encounter) => {
          // Date Filtering
          if (encounter.COND_CODE === condition) {
            filteredArray.push(d);
          } else if (condition === "all") {
            filteredArray.push(d);
          }
        });
      });
      // return d.toLowerCase().includes(term)
    });

    console.log(filteredArray);

    filteredArray.forEach((resultID) => {
      returnObject[resultID] = data[resultID];
    });

    const uniqueArray = Object.keys(returnObject).map((key) => key);

    setFilterArray(uniqueArray);

    // console.log(results)
    setData(returnObject);
  }, [condition]);

  React.useEffect(() => {
    const returnObject = {};

    const filteredArray = [];

    if (term.length > 0) {
      const results = fuse.search(term);
      console.log(results);
      results.forEach((result) => {
        filteredArray.push(result.item.PATIENT);
      });

      filteredArray.forEach((resultID) => {
        returnObject[resultID] = data[resultID];
      });

      const uniqueArray = Object.keys(returnObject).map((key) => key);

      setFilterArray(uniqueArray);
      // console.log(results)
      setData(returnObject);
    } else {
      setFilterArray([]);
      setData(data);
    }

    const filteredOrgs = organizations.filter((organization) => {
      return organization.name.toLowerCase().includes(term.toLowerCase());
    });

    setFilteredOrgs(filteredOrgs);
  }, [data, setData, term]);

  return (
    <div>
      <Select
        labelId="demo-mutiple-name-label"
        id="demo-mutiple-name"
        label="Conditions"
        value={condition}
        onChange={handleChange}
        fullWidth
        input={<Input />}
        // MenuProps={MenuProps}
      >
        {conditions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      <TextField
        label="Search (Hospital, State, City)"
        type="input"
        onChange={(e) => debounceSet(get(e, "target.value", "").toLowerCase())}
        fullWidth
      />
      <br />
      <Grid container spacing={2}>
        <MuiPickersUtilsProvider utils={MomentUtils}>
          <Grid item xs={6}>
            <DatePicker
              autoOk
              label="Start Date"
              clearable
              disableFuture
              format="YYYY-MM-DD"
              maxDate={endDate || new Date()}
              maxDateMessage="Date should be before start date."
              value={startDate}
              onChange={handleStartDateChange}
            />
          </Grid>
          <Grid item xs={6}>
            <DatePicker
              autoOk
              label="End Date"
              minDate={startDate || new Date("1900-01-01")}
              minDateMessage="Date should be after start date."
              clearable
              format="YYYY-MM-DD"
              disableFuture
              value={endDate}
              onChange={handleEndDateChange}
            />
          </Grid>
        </MuiPickersUtilsProvider>
      </Grid>
    </div>
  );
};

EncountersFilter.propTypes = {
  data: PropTypes.array,
  setData: PropTypes.func.isRequired,
  organizations: PropTypes.array,
  setFilteredOrgs: PropTypes.func,
  setFilterArray: PropTypes.func,
};

export default EncountersFilter;
