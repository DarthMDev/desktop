import { IAiClip, TClip } from 'services/highlighter';
import { SCRUB_HEIGHT, SCRUB_WIDTH, SCRUB_FRAMES } from 'services/highlighter/constants';
import React, { useMemo, useState } from 'react';
import path from 'path';
import { Services } from 'components-react/service-provider';
import { BoolButtonInput } from 'components-react/shared/inputs/BoolButtonInput';
import styles from './ClipsView.m.less';
import cx from 'classnames';
import { Button, Tooltip } from 'antd';
import { $t } from 'services/i18n';
import { isAiClip } from './utils';
import { InputEmojiSection } from './InputEmojiSection';

import { useVuex } from 'components-react/hooks';
export default function ClipPreview(props: {
  clipId: string;
  streamId: string | undefined;
  showTrim: () => void;
  showRemove: () => void;
}) {
  const { HighlighterService } = Services;
  const v = useVuex(() => ({
    clip: HighlighterService.views.clipsDictionary[props.clipId] as TClip,
  }));

  if (!v.clip) {
    return <div>deleted</div>;
  }
  const [scrubFrame, setScrubFrame] = useState(0);
  // TODO: placeholder image + make sure to regenerate sprite if sprite doesnt exist
  let clipThumbnail = v.clip.scrubSprite || '';

  const filename = useMemo(() => {
    return path.basename(v.clip.path);
  }, [v.clip.path]);
  // Deleted clips always show as disabled
  const enabled = v.clip.deleted ? false : v.clip.enabled;

  function mouseMove(e: React.MouseEvent) {
    const frameIdx = Math.floor((e.nativeEvent.offsetX / SCRUB_WIDTH) * SCRUB_FRAMES);

    if (scrubFrame !== frameIdx) {
      setScrubFrame(frameIdx);
    }
  }

  function setEnabled(enabled: boolean) {
    HighlighterService.actions.enableClip(v.clip.path, enabled);
  }

  function getInitialTime() {
    if (!v.clip.streamInfo) {
      return 'noStreamInfo';
    }

    const streamIds = Object.keys(v.clip.streamInfo);
    if (streamIds.length === 0) {
      return 'noStreamId';
    }

    const firstStreamId = props.streamId || streamIds[0]; // TODO M: Pass streamId here? or need to find the stream where the initialTime is not undefined
    const startTime = v.clip.streamInfo[firstStreamId]?.initialStartTime;
    const endTime = v.clip.streamInfo[firstStreamId]?.initialEndTime;

    return startTime !== undefined ? `${startTime} -${endTime}  ` : 'startTimeUndefined';
  }

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#2B383F',
        borderRadius: '16px',
        display: 'flex',
        gap: '16px',
        opacity: v.clip.enabled ? 1.0 : 0.3,
      }}
    >
      <div style={{ height: `${SCRUB_HEIGHT}px`, position: 'relative' }}>
        {!v.clip.deleted && (
          <img
            src={clipThumbnail}
            style={{
              width: `${SCRUB_WIDTH}px`,
              height: `${SCRUB_HEIGHT}px`,
              objectFit: 'none',
              objectPosition: `-${scrubFrame * SCRUB_WIDTH}px`,
              borderRadius: '10px',
            }}
            onMouseMove={mouseMove}
            onClick={props.showTrim}
          ></img>
        )}
        {v.clip.deleted && (
          <div
            style={{
              width: `${SCRUB_WIDTH}px`,
              height: `${SCRUB_HEIGHT}px`,
              borderRadius: '10px',
              background: 'black',
              verticalAlign: 'middle',
              display: 'inline-block',
              position: 'relative',
            }}
          >
            <i
              className="icon-trash"
              style={{
                position: 'absolute',
                textAlign: 'center',
                width: '100%',
                fontSize: 72,
                top: '27%',
              }}
            />
          </div>
        )}
        <span style={{ position: 'absolute', top: '10px', left: '10px' }}>
          <BoolButtonInput
            tooltip={enabled ? $t('Disable clip') : $t('Enable clip')}
            tooltipPlacement="top"
            value={enabled}
            onChange={setEnabled}
            checkboxStyles={{
              width: '24px',
              height: '24px',
              fontSize: '14px',
              background: 'white',
              borderColor: '#333',
            }}
            checkboxActiveStyles={{ background: 'var(--teal-hover)' }}
          />
        </span>
        <span
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            padding: '2px 4px',
            backgroundColor: 'black',
            borderRadius: '2px',
            opacity: 0.7,
          }}
        >
          {formatSecondsToHMS(v.clip.duration! - (v.clip.startTrim + v.clip.endTrim) || 0)}
        </span>
        {/* <div
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            fontSize: 18,
            padding: '2px 8px 0',
            borderRadius: '5px',
            background: 'rgba(0,0,0,0.5)',
            color: 'var(--highlighter-icon)',
          }}
        >
          <Tooltip title={$t('Trim clip')} placement="top">
            <i
              className={cx('icon-studio-mode-3', styles.clipAction)}
              style={{ marginRight: 12 }}
              onClick={props.showTrim}
            />
          </Tooltip>
          <Tooltip title={$t('Remove clip')} placement="top">
            <i className={cx('icon-trash', styles.clipAction)} onClick={props.showRemove} />
          </Tooltip>
        </div> */}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          borderRadius: '0 0 10px 10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* <div
              style={{
                fontSize: '16px',
                width: '184px',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {filename}
            </div> */}
            <div className={styles.typeTag}>
              {isAiClip(v.clip) ? (
                <>
                  <InputEmojiSection clips={[v.clip]} />{' '}
                </>
              ) : (
                <>
                  <i className="icon-highlighter" /> {v.clip.source}
                </>
              )}
            </div>
          </div>
          <div>
            {v.clip.source == 'AiClip' && (
              <FlameHypeScore score={v.clip.aiInfo.score}></FlameHypeScore>
            )}
            {/* <span style={{ fontSize: '21px', color: 'white' }}>{reachedPoints}</span>
            <span style={{ paddingBottom: '4px', paddingLeft: '2px' }}>/100</span> */}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: '16px' }}>
            {v.clip.source !== 'Manual' && (
              <>
                {`${
                  props.streamId &&
                  formatSecondsToHHMMSS(v.clip.streamInfo?.[props.streamId]?.initialStartTime)
                } - ${
                  props.streamId &&
                  formatSecondsToHHMMSS(v.clip.streamInfo?.[props.streamId]?.initialEndTime)
                } `}
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {' '}
            <Button
              size="large"
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              onClick={props.showRemove}
            >
              <i className="icon-trash" />
            </Button>
            <Button
              size="large"
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              onClick={props.showTrim}
            >
              <i className="icon-trim" /> Trim
            </Button>
            <Button
              size="large"
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              onClick={() => {}}
            >
              <i className="icon-crossclip" /> Export vertical
            </Button>
            <Button
              size="large"
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
              onClick={() => {}}
            >
              <i className="icon-download" /> Export clip
            </Button>
            {/* <Tooltip title={$t('Trim clip')} placement="top">
              <i
                className={cx('icon-studio-mode-3', styles.clipAction)}
                style={{ marginRight: 12 }}
                onClick={props.showTrim}
              />
            </Tooltip> */}
            {/* <Tooltip title={$t('Remove clip')} placement="top">
              <i className={cx('icon-trash', styles.clipAction)} onClick={props.showRemove} />
            </Tooltip> */}
          </div>
        </div>
        {/* {`${v.clip.deleted ? '[DELETED] ' : ''}${filename}`} */}
      </div>
    </div>
  );
}

function formatSecondsToHHMMSS(seconds: number | undefined): string {
  if (seconds === undefined) {
    return '00:00:00';
  }
  const totalSeconds = Math.round(seconds);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatSecondsToHMS(seconds: number): string {
  const totalSeconds = Math.round(seconds);
  if (totalSeconds === 0) {
    return '0s';
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${hours !== 0 ? hours.toString() + 'h ' : ''} ${
    minutes !== 0 ? minutes.toString() + 'm ' : ''
  }${remainingSeconds !== 0 ? remainingSeconds.toString() + 's' : ''}`;
}

function FlameHypeScore({ score }: { score: number }) {
  if (score === undefined) {
    return <></>;
  }
  const normalizedScore = Math.min(1, Math.max(0, score));
  const fullFlames = Math.ceil(normalizedScore * 5);

  return (
    <div className="flex items-center gap-1" style={{ fontSize: '19px' }}>
      {[...Array(fullFlames)].map((_, index) => (
        <React.Fragment key={'on' + index}>🔥</React.Fragment>
      ))}
      {[...Array(5 - fullFlames)].map((_, index) => (
        <span key={'off' + index} style={{ opacity: '0.3' }}>
          🔥
        </span>
      ))}
    </div>
  );
}
