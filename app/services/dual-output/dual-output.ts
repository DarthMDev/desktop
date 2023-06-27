import { PersistentStatefulService, InitAfter, Inject, ViewHandler, mutation } from 'services/core';
import {
  TDisplayPlatforms,
  TDualOutputPlatformSettings,
  DualOutputPlatformSettings,
  IDualOutputDestinationSetting,
  IDualOutputPlatformSetting,
} from './dual-output-data';
import { verticalDisplayData } from '../settings-v2/default-settings-data';
import { ScenesService, SceneItem, IPartialSettings, TSceneNode } from 'services/scenes';
import { IVideoSetting, TDisplayType, VideoSettingsService } from 'services/settings-v2/video';
import { StreamingService } from 'services/streaming';
import { TPlatform } from 'services/platforms';
import { EPlaceType } from 'services/editor-commands/commands/reorder-nodes';
import { EditorCommandsService } from 'services/editor-commands';
import { Subject } from 'rxjs';
import { TOutputOrientation } from 'services/restream';
import { IVideoInfo } from 'obs-studio-node';
import { ICustomStreamDestination } from 'services/settings/streaming';
import {
  ISceneCollectionsManifestEntry,
  SceneCollectionsService,
} from 'services/scene-collections';
import { IncrementalRolloutService, EAvailableFeatures } from 'services/incremental-rollout';

interface IDisplayVideoSettings {
  defaultDisplay: TDisplayType;
  horizontal: IVideoInfo;
  vertical: IVideoInfo;
  activeDisplays: {
    horizontal: boolean;
    vertical: boolean;
  };
}
interface IDualOutputServiceState {
  displays: TDisplayType[];
  platformSettings: TDualOutputPlatformSettings;
  destinationSettings: Dictionary<IDualOutputDestinationSetting>;
  dualOutputMode: boolean;
  videoSettings: IDisplayVideoSettings;
  isLoading: boolean;
}

class DualOutputViews extends ViewHandler<IDualOutputServiceState> {
  @Inject() private scenesService: ScenesService;
  @Inject() private videoSettingsService: VideoSettingsService;
  @Inject() private streamingService: StreamingService;
  @Inject() private sceneCollectionsService: SceneCollectionsService;
  @Inject() private incrementalRolloutService: IncrementalRolloutService;

  get activeSceneId(): string {
    return this.scenesService.views.activeSceneId;
  }

  get dualOutputMode(): boolean {
    return this.state.dualOutputMode;
  }

  get isLoading(): boolean {
    return this.state.isLoading;
  }

  get activeCollection(): ISceneCollectionsManifestEntry {
    return this.sceneCollectionsService.activeCollection;
  }

  get sceneNodeMaps(): { [sceneId: string]: Dictionary<string> } {
    return this.activeCollection.sceneNodeMaps;
  }

  get activeSceneNodeMap(): Dictionary<string> {
    return this.sceneNodeMaps[this.activeSceneId];
  }

  get hasVerticalNodes() {
    return !!this.sceneNodeMaps[this.activeSceneId];
  }

  get shouldCreateVerticalNode(): boolean {
    return this.dualOutputMode || this.hasVerticalNodes;
  }

  get platformSettings() {
    return this.state.platformSettings;
  }

  get destinationSettings() {
    return this.state.destinationSettings;
  }

  get hasVerticalContext() {
    return !!this.videoSettingsService.state.vertical;
  }

  get verticalNodeIds(): string[] {
    if (!this.activeSceneNodeMap) return;

    return Object.values(this.activeSceneNodeMap);
  }

  get displays() {
    return this.state.displays;
  }

  get activeDisplayPlatforms() {
    const enabledPlatforms = this.streamingService.views.enabledPlatforms;
    return Object.entries(this.state.platformSettings).reduce(
      (displayPlatforms: TDisplayPlatforms, [key, val]: [string, IDualOutputPlatformSetting]) => {
        if (val && enabledPlatforms.includes(val.platform)) {
          displayPlatforms[val.display].push(val.platform);
        }
        return displayPlatforms;
      },
      { horizontal: [], vertical: [] },
    );
  }

  get canStreamDualOutput(): boolean {
    // determine if both displays are selected for active platforms
    return (
      this.activeDisplayPlatforms.horizontal.length > 0 &&
      this.activeDisplayPlatforms.vertical.length > 0
    );
  }

  get videoSettings() {
    return this.state.videoSettings;
  }

  get activeDisplays() {
    return this.state.videoSettings.activeDisplays;
  }

  get defaultDisplay() {
    return this.state.videoSettings.defaultDisplay;
  }

  get shouldShowDualOutputCheckbox() {
    return this.incrementalRolloutService.views.featureIsEnabled(EAvailableFeatures.dualOutput);
  }

  get showHorizontalDisplay() {
    return !this.state.dualOutputMode || (this.activeDisplays.horizontal && !this.state.isLoading);
  }

  get showVerticalDisplay() {
    return (
      this.state.dualOutputMode && this.activeDisplayPlatforms.vertical && !this.state.isLoading
    );
  }

  getPlatformDisplay(platform: TPlatform) {
    return this.state.platformSettings[platform].display;
  }

  getPlatformContext(platform: TPlatform) {
    const display = this.getPlatformDisplay(platform);
    return this.videoSettingsService.state[display];
  }

  getPlatformMode(platform: TPlatform): TOutputOrientation {
    const display = this.getPlatformDisplay(platform);
    if (!display) return 'landscape';
    return display === 'horizontal' ? 'landscape' : 'portrait';
  }

  getMode(display?: TDisplayType): TOutputOrientation {
    if (!display) return 'landscape';
    return display === 'horizontal' ? 'landscape' : 'portrait';
  }

  getHorizontalNodeId(verticalNodeId: string, sceneId?: string) {
    const sceneNodeMap = sceneId ? this.sceneNodeMaps[sceneId] : this.activeSceneNodeMap;
    if (!sceneNodeMap) return;

    return Object.keys(sceneNodeMap).find(
      (horizontalNodeId: string) => sceneNodeMap[horizontalNodeId] === verticalNodeId,
    );
  }

  getVerticalNodeId(horizontalNodeId: string, sceneId?: string): string {
    const sceneNodeMap = sceneId ? this.sceneNodeMaps[sceneId] : this.activeSceneNodeMap;
    if (!sceneNodeMap) return;

    return Object.values(sceneNodeMap).find(
      (verticalNodeId: string) => sceneNodeMap[horizontalNodeId] === verticalNodeId,
    );
  }

  getVerticalNodeIds(sceneId: string): string[] {
    if (!this.sceneNodeMaps[sceneId]) return;

    return Object.values(this.sceneNodeMaps[sceneId]);
  }

  getMissingSelectionNodeIds(nodeIds: string[], sceneId?: string) {
    return nodeIds.reduce((missingNodeIds: string[], nodeId) => {
      const matchingNodeId =
        this.getVerticalNodeId(nodeId, sceneId) ?? this.getHorizontalNodeId(nodeId, sceneId);
      if (matchingNodeId && !nodeIds.includes(matchingNodeId)) {
        missingNodeIds.push(matchingNodeId);
      }
      return missingNodeIds;
    }, []);
  }

  getNodeDisplay(nodeId: string, sceneId: string) {
    const sceneNodeMap = sceneId ? this.sceneNodeMaps[sceneId] : this.activeSceneNodeMap;

    if (sceneNodeMap && Object.values(sceneNodeMap).includes(nodeId)) {
      return 'vertical';
    }

    // return horizontal by default because if the sceneNodeMap doesn't exist
    // dual output has never been toggled on with this scene active
    return 'horizontal';
  }

  getPlatformContextName(platform: TPlatform): TOutputOrientation {
    return this.getPlatformDisplay(platform) === 'horizontal' ? 'landscape' : 'portrait';
  }

  hasNodeMap(sceneId?: string) {
    const nodeMap = sceneId ? this.sceneNodeMaps[sceneId] : this.activeSceneNodeMap;
    return !!nodeMap && Object.keys(nodeMap).length > 0;
  }
}

@InitAfter('ScenesService')
export class DualOutputService extends PersistentStatefulService<IDualOutputServiceState> {
  @Inject() private scenesService: ScenesService;
  @Inject() private videoSettingsService: VideoSettingsService;
  @Inject() private editorCommandsService: EditorCommandsService;
  @Inject() private sceneCollectionsService: SceneCollectionsService;
  @Inject() private streamingService: StreamingService;

  static defaultState: IDualOutputServiceState = {
    displays: ['horizontal', 'vertical'],
    platformSettings: DualOutputPlatformSettings,
    destinationSettings: {},
    dualOutputMode: false,
    videoSettings: {
      defaultDisplay: 'horizontal',
      horizontal: null,
      vertical: verticalDisplayData, // get settings for horizontal display from obs directly
      activeDisplays: {
        horizontal: true,
        vertical: false,
      },
    },
    isLoading: false,
  };

  sceneNodeHandled = new Subject<number>();

  get views() {
    return new DualOutputViews(this.state);
  }

  init() {
    super.init();

    this.confirmDestinationDisplays(this.streamingService.views.customDestinations);

    // we need to confirm that the scene collection has a node map
    // because this is a new property added for dual output
    this.sceneCollectionsService.collectionSwitched.subscribe(() => {
      // confirm the scene collection has a node map
      if (!this.sceneCollectionsService.activeCollection.hasOwnProperty('sceneNodeMaps')) {
        this.sceneCollectionsService.initNodeMaps();
      }

      if (this.state.dualOutputMode) {
        this.setIsCollectionOrSceneLoading(false);
      }
    });

    this.scenesService.sceneSwitched.subscribe(scene => {
      // if the scene is not empty, handle vertical nodes
      if (scene?.nodes.length) {
        this.confirmOrCreateVerticalNodes(scene.id);
      }
    });

    this.scenesService.sourcesAdded.subscribe((sceneId: string) => {
      this.assignContexts(sceneId);
    });
  }

  /**
   * Edit dual output display settings
   */

  setdualOutputMode() {
    this.SET_SHOW_DUAL_OUTPUT();

    if (this.state.dualOutputMode) {
      this.confirmOrCreateVerticalNodes();
      this.toggleDisplay(true, 'vertical');
    }
  }

  /**
   * Create or confirm nodes for vertical output when toggling vertical display
   */

  confirmOrCreateVerticalNodes(sceneId?: string) {
    if (!this.views.hasNodeMap(sceneId) && this.state.dualOutputMode) {
      try {
        this.createSceneNodes();
      } catch (error: unknown) {
        console.error('Error toggling Dual Output mode: ', error);
      }
    } else {
      try {
        this.assignSceneNodes(sceneId);
      } catch (error: unknown) {
        console.error('Error toggling Dual Output mode: ', error);
      }
    }
  }

  assignSceneNodes(sceneId?: string) {
    this.SET_IS_LOADING(true);
    const sceneToMapId = sceneId ?? this.views.activeSceneId;
    // assign nodes to both contexts in dual output mode

    if (this.views.hasNodeMap()) {
      if (!this.videoSettingsService.contexts.vertical) {
        this.videoSettingsService.establishVideoContext('vertical');
      }

      const sceneItems = this.scenesService.views.getSceneItemsBySceneId(sceneToMapId);
      const verticalNodeIds = this.views.getVerticalNodeIds(sceneToMapId);

      if (!sceneItems) return;

      sceneItems.forEach((sceneItem: SceneItem, index: number) => {
        const display = verticalNodeIds?.includes(sceneItem.id) ? 'vertical' : 'horizontal';
        this.assignNodeContext(sceneItem, display);
        this.sceneNodeHandled.next(index);
      });
    } else {
      // if there is no node map for the scene, it has never been active in dual output mode
      // so will not have vertical nodes
      const sceneToMapId = sceneId ?? this.views.activeSceneId;
      const sceneItems = this.scenesService.views.getSceneItemsBySceneId(sceneToMapId);

      if (!sceneItems) return;

      sceneItems.forEach((sceneItem: SceneItem, index: number) => {
        this.assignNodeContext(sceneItem, 'horizontal');
        this.sceneNodeHandled.next(index);
      });
    }
    this.SET_IS_LOADING(false);
  }

  createSceneNodes(sceneId?: string) {
    this.SET_IS_LOADING(true);
    if (this.state.dualOutputMode && !this.videoSettingsService.contexts.vertical) {
      this.videoSettingsService.establishVideoContext('vertical');
    }

    const sceneToMapId = sceneId ?? this.views.activeSceneId;
    const nodes = this.scenesService.views.getScene(sceneToMapId).getNodes();

    this.editorCommandsService.executeCommand(
      'CopyNodesCommand',
      this.scenesService.views.getScene(sceneToMapId).getSelection(nodes),
      sceneToMapId,
      false,
      'vertical',
    );
    this.SET_IS_LOADING(false);
  }

  assignContexts(sceneId: string) {
    this.SET_IS_LOADING(true);
    const nodes = this.scenesService.views.getScene(sceneId).getNodes();

    nodes.forEach(node => {
      if (!node?.display) {
        const display = this.views.getNodeDisplay(node.id, sceneId);
        this.assignNodeContext(node, display);
      }
    });
    this.SET_IS_LOADING(false);
  }

  createOrAssignOutputNode(
    sceneItem: SceneItem,
    display: TDisplayType,
    isFirstDisplay: boolean,
    sceneId?: string,
  ) {
    if (isFirstDisplay) {
      // if it's the first display, just assign the scene item's output to a context
      this.assignNodeContext(sceneItem, display);
      return sceneItem;
    } else {
      // if it's not the first display, copy the scene item
      const scene = this.scenesService.views.getScene(sceneId);
      const copiedSceneItem = scene.addSource(sceneItem.sourceId);
      const context = this.videoSettingsService.contexts[display];

      if (!copiedSceneItem || !context) return null;

      const settings: IPartialSettings = { ...sceneItem.getSettings(), output: context, display };
      copiedSceneItem.setSettings(settings);

      const selection = scene.getSelection(copiedSceneItem.id);
      this.editorCommandsService.executeCommand(
        'ReorderNodesCommand',
        selection,
        sceneItem.id,
        EPlaceType.Before,
      );

      this.sceneCollectionsService.createNodeMapEntry(sceneId, sceneItem.id, copiedSceneItem.id);
      return copiedSceneItem;
    }
  }

  assignNodeContext(node: TSceneNode, display: TDisplayType) {
    if (node.isItem()) {
      const context = this.videoSettingsService.contexts[display];
      if (!context) return null;
      node.setSettings({ output: context, display });
    } else {
      // because folders just group scene items, they do not have their own output value
      // set the display for toggling in the source selector
      node.setDisplay(display);
    }

    return node.id;
  }

  /**
   * Settings for platforms to displays
   */

  updatePlatformSetting(platform: string, display: TDisplayType) {
    this.UPDATE_PLATFORM_SETTING(platform, display);
  }

  updateDestinationSetting(destination: string, display?: TDisplayType) {
    this.UPDATE_DESTINATION_SETTING(destination, display);
  }

  confirmDestinationDisplays(destinations: ICustomStreamDestination[]) {
    if (destinations.length) {
      destinations.forEach((destination: ICustomStreamDestination) => {
        if (!this.state.destinationSettings[destination.name]) {
          this.updateDestinationSetting(destination.name);
        }
      });
    }
  }

  /**
   * Show/hide displays
   */

  toggleDisplay(status: boolean, display: TDisplayType) {
    this.SET_DISPLAY_ACTIVE(status, display);
  }

  /**
   * Update Video Settings
   */

  setVideoSetting(setting: Partial<IVideoSetting>, display?: TDisplayType) {
    this.SET_VIDEO_SETTING(setting, display);
  }

  /**
   * Update loading state to show loading animation
   */

  setIsCollectionOrSceneLoading(status: boolean) {
    this.SET_IS_LOADING(status);
  }

  @mutation()
  private UPDATE_PLATFORM_SETTING(platform: TPlatform | string, display: TDisplayType) {
    this.state.platformSettings = {
      ...this.state.platformSettings,
      [platform]: { ...this.state.platformSettings[platform], display },
    };
  }

  @mutation()
  private UPDATE_DESTINATION_SETTING(destination: string, display: TDisplayType = 'horizontal') {
    if (!this.state.destinationSettings[destination]) {
      // create setting
      this.state.destinationSettings = {
        ...this.state.destinationSettings,
        [destination]: {
          destination,
          display,
        },
      };
    } else {
      // update setting
      this.state.destinationSettings = {
        ...this.state.destinationSettings,
        [destination]: { ...this.state.destinationSettings[destination], display },
      };
    }
  }

  @mutation()
  private SET_SHOW_DUAL_OUTPUT() {
    this.state = {
      ...this.state,
      dualOutputMode: !this.state.dualOutputMode,
    };
  }

  @mutation()
  private SET_DISPLAY_ACTIVE(status: boolean, display: TDisplayType) {
    const otherDisplay = display === 'horizontal' ? 'vertical' : 'horizontal';
    if (
      status === false &&
      this.state.videoSettings.activeDisplays[display] &&
      !this.state.videoSettings.activeDisplays[otherDisplay]
    ) {
      // if not dual output mode, swap the active displays

      this.state.videoSettings.activeDisplays = {
        ...this.state.videoSettings.activeDisplays,
        [display]: status,
        [otherDisplay]: !status,
      };
    } else {
      this.state.videoSettings.activeDisplays = {
        ...this.state.videoSettings.activeDisplays,
        [display]: status,
      };
    }

    // swap default display if needed
    if (!status) {
      const otherDisplay = display === 'horizontal' ? 'vertical' : 'horizontal';
      this.state.videoSettings.defaultDisplay = display;
    }
  }

  @mutation()
  private SET_VIDEO_SETTING(setting: Partial<IVideoSetting>, display: TDisplayType = 'vertical') {
    this.state.videoSettings[display] = {
      ...this.state.videoSettings[display],
      ...setting,
    };
  }

  @mutation()
  private SET_IS_LOADING(status: boolean) {
    this.state = { ...this.state, isLoading: status };
  }
}
