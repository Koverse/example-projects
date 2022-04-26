import React from "react";
import { shallow } from "enzyme";
import EncountersPage from "./EncountersPage";

describe("EncountersPage...", () => {
  const wrap = (props = {}) => shallow(<EncountersPage {...props} />);

  it("renders...", () => {
    const wrapper = wrap();
    expect(wrapper).toHaveLength(1);
  });
});
