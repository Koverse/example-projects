import React from "react";
import { shallow } from "enzyme";
import EncountersDrawer from ".";

describe("EncountersDrawer...", () => {
  const wrap = (props = {}) => shallow(<EncountersDrawer {...props} />);

  it("renders...", () => {
    const wrapper = wrap();
    expect(wrapper).toHaveLength(1);
  });
});
