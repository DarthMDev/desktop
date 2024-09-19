import React from 'react';
import { HighlighterService, IHighlightedStream, IViewState, TClip } from 'services/highlighter';
import styles from './StreamView.m.less';
import { Button } from 'antd';
import { Services } from 'components-react/service-provider';
import { isAiClip } from './utils';
import { useVuex } from 'components-react/hooks';
import { InputEmojiSection } from './InputEmojiSection';

export default function StreamCard({
  streamId,
  clipsOfStreamAreLoading,
  emitSetView,
  emitGeneratePreview,
  emitExportVideo,
  emitRemoveStream,
}: {
  streamId: string;
  clipsOfStreamAreLoading: string | null;
  emitSetView: (data: IViewState) => void;
  emitGeneratePreview: () => void;
  emitExportVideo: () => void;
  emitRemoveStream: () => void;
}) {
  const { HighlighterService } = Services;
  const clips = useVuex(() => HighlighterService.views.clips.filter(c => c.streamInfo?.[streamId]));
  const stream = useVuex(() =>
    HighlighterService.views.highlightedStreams.find(s => s.id === streamId),
  );
  if (!stream) {
    return <>error</>;
  }

  function getFailedText(): string {
    if (stream?.state.type === 'error') {
      return 'Ai detection failed';
    }
    if (stream?.state.type === 'detection-canceled-by-user') {
      return 'Ai-detection cancelled';
    }
    return '';
  }

  function getActionRow(): JSX.Element {
    if (stream?.state.type === 'detection-in-progress') {
      return (
        <div className={styles.progressbarBackground}>
          <div
            style={{
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '16px',
              position: 'absolute',
              color: 'black',
              fontSize: '16px',
            }}
          >
            Creating ai highlights...
          </div>
          <div
            className={styles.progressbarProgress}
            style={{
              width: `${stream.state.progress}%`,
              transition: 'width 1s',
            }}
          ></div>{' '}
        </div>
      );
    }

    if (stream && clips.length > 0) {
      return (
        <div
          style={{
            display: 'flex',
            gap: '4px',
            justifyContent: 'space-between',
          }}
        >
          <Button
            size="large"
            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            onClick={() => {
              showStreamClips();
            }}
          >
            <i className="icon-edit" /> Edit clips
          </Button>

          {/* TODO: What clips should be included when user clicks this button + bring normal export modal in here */}
          <Button
            size="large"
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
            type="primary"
            onClick={e => {
              emitExportVideo();
              e.stopPropagation();
            }}
          >
            {clipsOfStreamAreLoading === stream.id ? (
              //  TODO: replace with correct loader
              <div className={styles.loader}></div>
            ) : (
              <>
                <i className="icon-download" /> {'Export highlight reel'}
              </>
            )}
          </Button>
        </div>
      );
    }

    //if failed
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', textAlign: 'center' }}>
          {getFailedText()}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <Button
            size="large"
            style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            onClick={e => {
              emitSetView({ view: 'clips', id: stream!.id });
              e.stopPropagation();
            }}
          >
            Add clips
          </Button>
        </div>
      </div>
    );
  }

  function getThumbnailText(): JSX.Element | string {
    if (clipsOfStreamAreLoading === stream?.id) {
      return (
        <>
          <div className={styles.loader}></div>
        </>
      );
    }

    if (clips.length > 0) {
      return <PlayButton />;
    }

    if (stream?.state.type === 'detection-in-progress') {
      return 'Searching for highlights...';
    }

    if (stream?.state.type === 'detection-finished') {
      if (clips.length === 0) {
        return 'Not enough highlights found';
      }

      return <PlayButton />;
    }

    if (stream?.state.type === 'detection-canceled-by-user') {
      return 'Ai-detection cancelled';
    }

    if (stream?.state.type === 'error') {
      return 'Ai-detection cancelled';
    }

    return '';
  }

  function showStreamClips() {
    if (stream?.state.type !== 'detection-in-progress') {
      emitSetView({ view: 'clips', id: stream?.id });
    }
  }
  return (
    <div
      className={styles.streamCard}
      onClick={() => {
        showStreamClips();
      }}
    >
      <div className={`${styles.thumbnailWrapper} `}>
        {' '}
        <Button
          size="large"
          className={styles.deleteButton}
          onClick={e => {
            emitRemoveStream();
            e.stopPropagation();
          }}
          style={{ backgroundColor: '#00000040', border: 'none', position: 'absolute' }}
        >
          <i className="icon-trash" />
        </Button>
        <img
          onClick={e => {
            if (stream.state.type !== 'detection-in-progress') {
              emitGeneratePreview();
              e.stopPropagation();
            }
          }}
          style={{ height: '100%' }}
          src={
            clips.find(clip => clip?.streamInfo?.[streamId]?.orderPosition === 0)?.scrubSprite ||
            clips.find(clip => clip.scrubSprite)?.scrubSprite
          }
          alt=""
        />
        <div className={styles.centeredOverlayItem}>
          {' '}
          <div
            onClick={e => {
              if (stream.state.type !== 'detection-in-progress') {
                emitGeneratePreview();
                e.stopPropagation();
              }
            }}
          >
            {getThumbnailText()}
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '20px',
          paddingTop: '0px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px',
            height: 'fit-content',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              height: 'fit-content',
            }}
          >
            <h2
              style={{
                margin: 0,
                width: '275px',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {stream.title}
            </h2>
            <p style={{ margin: 0, fontSize: '12px' }}>{new Date(stream.date).toDateString()}</p>
          </div>
          <div style={{ width: '74px', position: 'relative' }}>
            {clips.length > 0 ? (
              <div style={{ transform: 'translateX(-10px)' }}>
                <div
                  className={styles.centeredOverlayItem}
                  style={{
                    display: 'flex',
                    gap: '3px',
                    paddingRight: '3px',
                    textShadow: '0px 0px 6px black',
                    transform: 'translate(-24px, 17px)',
                  }}
                >
                  <span>{clips.length}</span>
                  <span>clips</span>
                </div>
                {clips.slice(0, 3).map((clip, index) => (
                  <div
                    className={styles.thumbnailWrapperSmall}
                    style={{
                      rotate: `${(index - 1) * 6}deg`,
                      scale: '1.2',
                      transform: `translate(${(index - 1) * 9}px, ${
                        index === 1 ? 0 + 4 : 2 + 4
                      }px)`,
                      zIndex: index === 1 ? 10 : 0,
                    }}
                    key={index}
                  >
                    <img
                      style={{ height: '100%' }}
                      src={
                        clip.scrubSprite ||
                        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACHBAMAAAB+jn0OAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAIVBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt0UjBAAAACnRSTlMAECAwQFBgcJC/CGe/dwAAAFtJREFUaN7twTEBAAAAwqD1T20IX4hAYcCAAQMGDBgwYMCAAQMGDBgwYMCAAQMGDBgwYMCAAQMGDBgwYMCAAQMGDBgwYMCAAQMGDBgwYMCAAQMGDBgwYMCAAQN+GyZoAAHBUKQAAAAASUVORK5CYII='
                      }
                      alt={`Clip ${index + 1}`}
                    />
                  </div>
                ))}{' '}
              </div>
            ) : (
              ''
            )}
          </div>
        </div>
        <div style={{ paddingTop: '6px', paddingBottom: '6px' }}>
          <h3
            style={{
              margin: 0,
              display: 'flex',
              gap: '8px',
              justifyContent: 'start',
            }}
          >
            <InputEmojiSection clips={clips} />
          </h3>
        </div>
        {getActionRow()}
      </div>
    </div>
  );
}

const PlayButton = () => (
  <svg width="26" height="32" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M24.2563 14.5427L3.94511 0.772117C2.52332 -0.211497 0.695312 0.772117 0.695312 2.3459V29.8871C0.695312 31.4609 2.52332 32.4445 3.94511 31.4609L24.2563 17.6903C25.2719 16.9034 25.2719 15.3296 24.2563 14.5427Z"
      fill="white"
    />
  </svg>
);