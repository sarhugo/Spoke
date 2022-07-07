import React from "react";
import PropTypes from "prop-types";
import NodeEditor from "./NodeEditor";
import InputGroup from "../inputs/InputGroup";
import StringInput from "../inputs/StringInput";
import VideoInput from "../inputs/VideoInput";
import { HourglassHalf } from "styled-icons/fa-solid/HourglassHalf";
import AudioParamsProperties from "./AudioParamsProperties";
import useSetPropertySelected from "./useSetPropertySelected";
import AttributionNodeEditor from "./AttributionNodeEditor";
import { SourceType } from "../../editor/objects/AudioParams";

export default function TimeCapsuleNodeEditor(props) {
  const { editor, node } = props;
  const onChangeSrc = useSetPropertySelected(editor, "src");
  const onChangeJsonUrl = useSetPropertySelected(editor, "jsonUrl");

  return (
    <NodeEditor description={TimeCapsuleNodeEditor.description} {...props}>
      <InputGroup name="Video">
        <VideoInput value={node.src} onChange={onChangeSrc} />
      </InputGroup>
      <InputGroup name="JSON Url">
        <StringInput value={node.jsonUrl} onChange={onChangeJsonUrl} />
      </InputGroup>
      <AudioParamsProperties sourceType={SourceType.MEDIA_VIDEO} {...props} />
      <AttributionNodeEditor name="Attribution" {...props} />
    </NodeEditor>
  );
}

TimeCapsuleNodeEditor.propTypes = {
  editor: PropTypes.object,
  node: PropTypes.object,
  multiEdit: PropTypes.bool
};

TimeCapsuleNodeEditor.iconComponent = HourglassHalf;

TimeCapsuleNodeEditor.description = "Displays a video as a time capsule.";
