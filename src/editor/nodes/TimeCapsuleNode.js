import timeCapsuleUrl from "../../assets/time-capsule/time-capsule.glb";
import spokeLandingVideo from "../../assets/video/SpokePromo.mp4";
import { GLTFLoader } from "../gltf/GLTFLoader";
import { AudioElementType } from "../objects/AudioParams";
import Video from "../objects/Video";
import AudioParamsNode from "./AudioParamsNode";
import Hls from "hls.js/dist/hls.light";
import cloneObject3D from "../utils/cloneObject3D";
import isHLS from "../utils/isHLS";
import { RethrownError } from "../utils/errors";
import { getObjectPerfIssues } from "../utils/performance";

let timeCapsuleModel = null;

export default class TimeCapsuleNode extends AudioParamsNode(Video) {
  static componentName = "time-capsule";

  static nodeName = "TimeCapsule";

  static initialElementProps = {
    src: new URL(spokeLandingVideo, location).href
  };

  static async load() {
    if (timeCapsuleModel) {
      return Promise.resolve(timeCapsuleModel);
    }

    timeCapsuleModel = await new GLTFLoader(timeCapsuleUrl).loadGLTF();
    return timeCapsuleModel;
  }

  static async deserialize(editor, json, loadAsync, onError) {
    const node = await super.deserialize(editor, json);

    const videoComp = json.components.find(c => c.name === TimeCapsuleNode.componentName);

    const { src, jsonUrl } = videoComp.props;

    loadAsync(
      (async () => {
        await node.load(src, onError);
        node.controls = false;
        node.autoPlay = false;
        node.loop = false;
        node.projection = "custom";
      })()
    );

    node.jsonUrl = jsonUrl;
    return node;
  }

  constructor(editor) {
    super(editor, editor.audioListener, AudioElementType.VIDEO);

    this.jsonUrl = "";
    this._canonicalUrl = "";
    this._autoPlay = false;
    this.controls = false;
    this._projection = "custom";

    if (!timeCapsuleModel) {
      throw new Error("TimeCapsule must be loaded before it can be used. Await TimeCapsule.load()");
    }

    this._capsule = cloneObject3D(timeCapsuleModel.scene);
    this.editor.renderer.addBatchedObject(this._capsule);
    this._capsule.traverse(object => {
      if (object.material && object.material.isMeshStandardMaterial) {
        object.material.envMap = this.editor.scene.environmentMap;
        object.material.needsUpdate = true;
      }
    });
    this._screen = this._capsule.children.find(o => o.name === "Screen");
    this._screen.material = this._mesh.material;
    this._mesh.visible = false;

    this.add(this._capsule);
  }

  get src() {
    return this._canonicalUrl;
  }

  set src(value) {
    this.load(value).catch(console.error);
  }

  async load(src, onError) {
    const nextSrc = src || "";

    if (nextSrc === this._canonicalUrl && nextSrc !== "") {
      return;
    }
    this._screen.visible = false;
    this._canonicalUrl = src || "";

    this.issues = [];

    this.hideErrorIcon();
    this.showLoadingCube();

    if (this.editor.playing) {
      this.el.pause();
    }

    try {
      const { accessibleUrl, contentType, meta } = await this.editor.api.resolveMedia(src);

      this.meta = meta;

      this.updateAttribution();

      const isHls = isHLS(src, contentType);

      if (isHls) {
        this.hls = new Hls({
          xhrSetup: (xhr, url) => {
            xhr.open("GET", this.editor.api.unproxyUrl(src, url));
          }
        });
      }

      await super.load(accessibleUrl, contentType);
      this._mesh.visible = false;
      this._screen.visible = true;

      if (isHls && this.hls) {
        this.hls.stopLoad();
      } else if (this.el.duration) {
        this.el.currentTime = 1;
      }

      if (this.editor.playing && this.autoPlay) {
        this.el.play();
      }

      this.issues = getObjectPerfIssues(this._mesh, false);
    } catch (error) {
      this.showErrorIcon();

      const videoError = new RethrownError(`Error loading video ${this._canonicalUrl}`, error);

      if (onError) {
        onError(this, videoError);
      }

      console.error(videoError);

      this.issues.push({ severity: "error", message: "Error loading video." });
    }

    this.editor.emit("objectsChanged", [this]);
    this.editor.emit("selectionChanged");
    this.hideLoadingCube();

    return this;
  }

  onPause() {
    this.el.pause();
    this.el.currentTime = 0;
  }

  onChange() {
    this.onResize();
  }

  clone(recursive) {
    return new this.constructor(this.editor, this.audioListener).copy(this, recursive);
  }

  copy(source, recursive = true) {
    super.copy(source, recursive);

    this.jsonUrl = source.jsonUrl;
    this._canonicalUrl = source._canonicalUrl;

    return this;
  }

  serialize() {
    const components = {
      [TimeCapsuleNode.componentName]: {
        src: this._canonicalUrl,
        jsonUrl: this.jsonUrl
      }
    };

    return super.serialize(components);
  }

  prepareForExport() {
    super.prepareForExport();

    this.addGLTFComponent("time-capsule", {
      jsonUrl: this.jsonUrl
    });

    this.addGLTFComponent("video", {
      src: this._canonicalUrl,
      controls: this.controls,
      autoPlay: this.autoPlay,
      loop: this.loop,
      projection: this.projection
    });

    this.addGLTFComponent("networked", {
      id: this.uuid
    });

    this.replaceObject();
  }

  getRuntimeResourcesForStats() {
    if (this._texture) {
      return {
        textures: [this._texture],
        meshes: [this._mesh],
        materials: [this._mesh.material]
      };
    }
  }
}
