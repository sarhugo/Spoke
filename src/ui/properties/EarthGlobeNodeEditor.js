import PropTypes from "prop-types";
import React, { Component } from "react";
import NodeEditor from "./NodeEditor";
import { GlobeEurope } from "styled-icons/fa-solid/GlobeEurope";
import InputGroup from "../inputs/InputGroup";
import ImageInput from "../inputs/ImageInput";
import StringInput from "../inputs/StringInput";

export default class EarthGlobeNodeEditor extends Component {
  static iconComponent = GlobeEurope;

  static description = "An earth globe to show different landmarks.";

  static propTypes = {
    editor: PropTypes.object,
    node: PropTypes.object
  };

  constructor(props) {
    super(props);
    const createPropSetter = propName => value => this.props.editor.setPropertySelected(propName, value);
    this.onChangeGlobeTexture = createPropSetter("globeTexture");
    this.onChangeBumpMap = createPropSetter("bumpMap");
    this.onChangeJsonUrl = createPropSetter("jsonUrl");
  }

  render() {
    const { node } = this.props;

    return (
      <NodeEditor {...this.props} description={EarthGlobeNodeEditor.description}>
        <InputGroup name="Earth Texture Url">
          <ImageInput value={node.globeTexture} onChange={this.onChangeGlobeTexture} />
        </InputGroup>
        <InputGroup name="Bump Map Url">
          <ImageInput value={node.bumpMap} onChange={this.onChangeBumpMap} />
        </InputGroup>
        <InputGroup name="JSON Url">
          <StringInput value={node.jsonUrl} onChange={this.onChangeJsonUrl} />
        </InputGroup>
      </NodeEditor>
    );
  }
}
