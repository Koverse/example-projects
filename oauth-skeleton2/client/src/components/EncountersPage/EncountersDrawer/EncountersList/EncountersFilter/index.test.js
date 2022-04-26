import React from "react";
import { shallow } from "enzyme";
import EncountersFilter from ".";

describe("EncountersFilter...", () => {
  const wrap = (props = {}) => shallow(<EncountersFilter {...props} />);

  it("renders...", () => {
    const wrapper = wrap();
    expect(wrapper).toHaveLength(1);
  });
});
