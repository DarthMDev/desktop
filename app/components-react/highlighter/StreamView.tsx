import { useVuex } from 'components-react/hooks';
import React, { useState } from 'react';
import { Services } from 'components-react/service-provider';
// import styles from './ClipsView.m.less';
import styles from './StreamView.m.less';
import { IViewState, StreamInfoForAiHighlighter, TClip } from 'services/highlighter';
import isEqual from 'lodash/isEqual';
import { Modal, Button } from 'antd';
import ExportModal from 'components-react/highlighter/ExportModal';
import PreviewModal from 'components-react/highlighter/PreviewModal';
import { SUPPORTED_FILE_TYPES } from 'services/highlighter/constants';
import Scrollable from 'components-react/shared/Scrollable';
import { IHotkey } from 'services/hotkeys';
import { getBindingString } from 'components-react/shared/HotkeyBinding';
import { $t } from 'services/i18n';
import * as remote from '@electron/remote';
import uuid from 'uuid';
import StreamCard from './StreamCard';

type TModalStreamView =
  | { type: 'export'; id: string | undefined }
  | { type: 'preview'; id: string | undefined }
  | { type: 'upload' }
  | null;

interface IClipsViewProps {
  id: string | undefined;
}

export default function StreamView({ emitSetView }: { emitSetView: (data: IViewState) => void }) {
  const { HighlighterService, HotkeysService, UsageStatisticsService } = Services;
  const v = useVuex(() => ({
    clips: HighlighterService.views.clips as TClip[],
    dismissedTutorial: HighlighterService.views.dismissedTutorial,
    highlightedStreams: HighlighterService.views.highlightedStreams,

    exportInfo: HighlighterService.views.exportInfo,
    error: HighlighterService.views.error,
  }));

  const [showModal, rawSetShowModal] = useState<TModalStreamView | null>(null);
  const [modalWidth, setModalWidth] = useState('700px');
  const [hotkey, setHotkey] = useState<IHotkey | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [clipsOfStreamAreLoading, setClipsOfStreamAreLoading] = useState<string | null>(null);

  // This is kind of weird, but ensures that modals stay the right
  // size while the closing animation is played. This is why modal
  // width has its own state. This makes sure we always set the right
  // size whenever displaying a modal.
  function setShowModal(modal: TModalStreamView | null) {
    rawSetShowModal(modal);

    if (modal && modal.type) {
      setModalWidth(
        {
          trim: '60%',
          preview: '700px',
          export: '700px',
          remove: '400px',
          upload: '400px',
        }[modal.type],
      );
    }
  }

  function removeStream(id?: string) {
    if (!id) {
      console.error('Cant remove stream, missing id');
      return;
    }
    HighlighterService.actions.removeStream(id);
  }

  async function previewVideo(id?: string) {
    if (!id) {
      console.error('Id needed to preview stream clip collection, missing id');
      return;
    }
    setClipsOfStreamAreLoading(id);
    HighlighterService.actions.enableOnlySpecificClips(HighlighterService.views.clips, id);
    try {
      await HighlighterService.loadClips(id);
      setClipsOfStreamAreLoading(null);
      rawSetShowModal({ type: 'preview', id });
    } catch (error: unknown) {
      setClipsOfStreamAreLoading(null);
    }
  }

  async function exportVideo(id?: string) {
    if (!id) {
      console.error('Id needed to export stream clip collection, missing id');
      return;
    }

    setClipsOfStreamAreLoading(id);
    HighlighterService.actions.enableOnlySpecificClips(HighlighterService.views.clips, id);

    try {
      await HighlighterService.loadClips(id);
      setClipsOfStreamAreLoading(null);
      rawSetShowModal({ type: 'export', id });
      console.log('startExport');
    } catch (error: unknown) {
      setClipsOfStreamAreLoading(null);
    }
  }

  const [inspectedClipPath, setInspectedClipPath] = useState<string | null>(null);
  let inspectedClip: TClip | null;

  if (inspectedClipPath) {
    inspectedClip = v.clips.find(c => c.path === inspectedClipPath) ?? null;
  }

  function ImportStreamModal({ close }: { close: () => void }) {
    const { HighlighterService } = Services;
    const [inputValue, setInputValue] = useState<string>('');

    function handleInputChange(event: any) {
      setInputValue(event.target.value);
    }

    async function startAnalysis(title: string) {
      const streamInfo: StreamInfoForAiHighlighter = {
        id: 'manual_' + uuid(),
        title,
      };

      const filePath = await importStreamFromDevice();
      if (filePath) {
        HighlighterService.actions.flow(filePath[0], streamInfo);
        close();
      }
    }

    return (
      <>
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '8px',
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <h1 style={{ margin: 0 }}>Import stream</h1>
            <input
              style={{ width: '100%' }}
              type="text"
              name="name"
              placeholder="Set a title for your stream"
              onChange={handleInputChange}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            {' '}
            <Button type="default" onClick={() => close()}>
              Cancel
            </Button>
            <Button type="primary" onClick={() => startAnalysis(inputValue)}>
              Select video to start import
            </Button>
          </div>
        </div>
      </>
    );
  }

  async function importStreamFromDevice() {
    const selections = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
      properties: ['openFile'],
      filters: [{ name: $t('Video Files'), extensions: SUPPORTED_FILE_TYPES }],
    });

    if (selections && selections.filePaths) {
      return selections.filePaths;
    }
  }

  function closeModal() {
    // Do not allow closing export modal while export/upload operations are in progress
    if (v.exportInfo.exporting) return;

    setInspectedClipPath(null);
    setShowModal(null);

    if (v.error) HighlighterService.actions.dismissError();
  }

  function getStreamView() {
    return (
      <div
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
        className={styles.streamViewRoot}
      >
        <div style={{ display: 'flex', padding: 20 }}>
          <div style={{ flexGrow: 1 }}>
            {/* <h1>{$t('Highlighter')}</h1>
            <p>{$t('Drag & drop to reorder clips.')}</p> */}
            <h1 style={{ margin: 0 }}>My stream highlights</h1>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Button
              disabled={v.highlightedStreams.some(s => s.state.type === 'detection-in-progress')}
              onClick={() => setShowModal({ type: 'upload' })}
            >
              Import
            </Button>
            <Button onClick={() => emitSetView({ view: 'settings' })}>Settings</Button>
          </div>
        </div>

        <Scrollable style={{ flexGrow: 1, padding: '20px 0 20px 20px' }}>
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {v.highlightedStreams.length === 0 ? (
              <>No highlight clips created from streams</>
            ) : (
              <>
                {v.highlightedStreams.map(highlightedStream => (
                  <StreamCard
                    key={highlightedStream.id}
                    stream={highlightedStream}
                    clips={HighlighterService.getClips(v.clips, highlightedStream.id)}
                    emitSetView={data => emitSetView(data)}
                    emitGeneratePreview={() => previewVideo(highlightedStream.id)}
                    emitExportVideo={() => exportVideo(highlightedStream.id)}
                    emitRemoveStream={() => removeStream(highlightedStream.id)}
                    clipsOfStreamAreLoading={clipsOfStreamAreLoading}
                  />
                ))}
              </>
            )}
          </div>
        </Scrollable>

        <Modal
          getContainer={`.${styles.streamViewRoot}`}
          onCancel={closeModal}
          footer={null}
          width={modalWidth}
          closable={false}
          visible={!!showModal}
          destroyOnClose={true}
          keyboard={false}
        >
          {/* {!!v.error && <Alert message={v.error} type="error" showIcon />} */}
          {/* {inspectedClip && showModal === 'trim' && <ClipTrimmer clip={inspectedClip} />} */}
          {showModal?.type === 'upload' && <ImportStreamModal close={closeModal} />}
          {showModal?.type === 'export' && (
            <ExportModal close={closeModal} streamId={showModal.id} />
          )}
          {showModal?.type === 'preview' && (
            <PreviewModal close={closeModal} streamId={showModal.id} />
          )}
          {/* {inspectedClip && showModal === 'remove' && (
            <RemoveClip close={closeModal} clip={inspectedClip} />
          )} */}
        </Modal>
      </div>
    );
  }

  // if (!v.loaded) return getLoadingView();

  return getStreamView();
}
