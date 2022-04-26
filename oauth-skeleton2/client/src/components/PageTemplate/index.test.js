import React from "react";
import { ThemeProvider } from "@material-ui/styles";
import { createMuiTheme } from "@material-ui/core/styles";
import { mount, shallow } from "enzyme";
import Page from ".";

const PageTemplate = (props) => (
  <ThemeProvider theme={createMuiTheme()}>
    <Page {...props}>test</Page>
  </ThemeProvider>
);
const wrap = (props = {}) => shallow(<PageTemplate {...props} />);

describe("PageTemplate...", () => {
  it("mounts...", () => {
    mount(<PageTemplate>test</PageTemplate>);
  });

  it("renders children when passed in...", () => {
    const wrapper = wrap();

    expect(wrapper.contains("test")).toBe(true);
  });
});
