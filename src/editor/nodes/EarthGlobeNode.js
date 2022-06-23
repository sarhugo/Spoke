import { Mesh, MeshPhongMaterial, SphereBufferGeometry } from "three";
import EditorNodeMixin from "./EditorNodeMixin";
import { RethrownError } from "../utils/errors";
import { getObjectPerfIssues, maybeAddLargeFileIssue } from "../utils/performance";

const DEFAULT_GLOBE_TEXTURE = "https://upload.wikimedia.org/wikipedia/commons/a/ac/Earthmap1000x500.jpg";
const DEFAULT_BUMP_MAP =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Srtm_ramp2.world.21600x10800.jpg/2560px-Srtm_ramp2.world.21600x10800.jpg";

export default class EarthGlobeNode extends EditorNodeMixin(Mesh) {
  static componentName = "earth-globe";

  static nodeName = "Earth Globe";

  static initialElementProps = {
    globeTexture: DEFAULT_GLOBE_TEXTURE,
    bumpMap: DEFAULT_BUMP_MAP
  };

  constructor(editor) {
    super(editor, new SphereBufferGeometry(1, 32, 32), new MeshPhongMaterial());

    this._globeTexture = "";
    this._bumpMap = "";
    this.jsonUrl = "";
  }

  get globeTexture() {
    return this._globeTexture;
  }

  set globeTexture(value) {
    this.loadTextures(value, this.bumpMap).catch(console.error);
  }

  get bumpMap() {
    return this._bumpMap;
  }

  set bumpMap(value) {
    this.loadTextures(this.globeTexture, value).catch(console.error);
  }

  async loadTexture(src) {
    if (!src) {
      return;
    }
    const { accessibleUrl, meta } = await this.editor.api.resolveMedia(src);
    this.meta = meta;
    this.updateAttribution();
    this.issues = getObjectPerfIssues(this, false);
    const perfEntries = performance.getEntriesByName(accessibleUrl);
    if (perfEntries.length > 0) {
      const imageSize = perfEntries[0].encodedBodySize;
      maybeAddLargeFileIssue("image", imageSize, this.issues);
    }
    const texture = await this.editor.textureCache.get(accessibleUrl);
    return texture;
  }

  async loadTextures(globeTexture, bumpMap, onError) {
    const promises = [];
    this.issues = [];
    this.hideErrorIcon();
    this.showLoadingCube();

    this._globeTexture = globeTexture;
    promises.push(this.loadTexture(globeTexture));

    this._bumpMap = bumpMap;
    promises.push(this.loadTexture(bumpMap));

    return Promise.all(promises)
      .then(textures => {
        this.material.map = textures[0];
        this.material.bumpMap = textures[1];
        this.material.bumpScale = 0.05;
        this.material.needsUpdate = true;
        this.editor.emit("objectsChanged", [this]);
        this.editor.emit("selectionChanged");
        this.hideLoadingCube();
      })
      .catch(error => {
        this.showErrorIcon();
        const imageError = new RethrownError("Error loading image textures", error);
        this.issues.push({ severity: "error", message: "Error loading image." });
        if (onError) {
          onError(this, imageError);
        }
      });
  }

  static async deserialize(editor, json, loadAsync, onError) {
    const node = await super.deserialize(editor, json);

    const { globeTexture, bumpMap, jsonUrl } = json.components.find(c => c.name === EarthGlobeNode.componentName).props;

    loadAsync(
      (async () => {
        await node.loadTextures(globeTexture, bumpMap, onError);
      })()
    );

    node.jsonUrl = jsonUrl;
    return node;
  }

  copy(source, recursive = true) {
    super.copy(source, recursive);

    this.material.map = source.material.map;
    this.material.bumpMap = source.material.bumpMap;
    this.material.bumpScale = source.material.bumpScale;

    this._globeTexture = source._globeTexture;
    this._bumpMap = source._bumpMap;
    this.jsonUrl = source.jsonUrl;

    return this;
  }

  serialize() {
    return super.serialize({
      [EarthGlobeNode.componentName]: {
        globeTexture: this.globeTexture,
        bumpMap: this.bumpMap,
        jsonUrl: this.jsonUrl
      }
    });
  }

  prepareForExport() {
    // You need to call the super method for the GLTFExporter to properly work with this object.
    super.prepareForExport();

    // Then we can add the rotate component and set the speed component.
    this.addGLTFComponent("earth-globe", {
      bumpMap: this.bumpMap,
      jsonUrl: this.jsonUrl
    });
  }
}
