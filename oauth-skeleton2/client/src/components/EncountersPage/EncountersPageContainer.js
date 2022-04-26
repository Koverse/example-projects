import { connect } from "react-redux";
import EncountersPage from "./EncountersPage";

import { getUser } from "../../store/selectors/auth";

const mapStateToProps = (state) => ({
  user: getUser(state),
});

export default connect(mapStateToProps)(EncountersPage);
