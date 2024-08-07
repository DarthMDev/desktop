import ClipsView from 'components-react/highlighter/ClipsView';
import SettingsView from 'components-react/highlighter/SettingsView';
import { useVuex } from 'components-react/hooks';
import React, { useEffect, useState } from 'react';
import { TClip, IHighlighterData, IViewState } from 'services/highlighter';
import { Services } from 'components-react/service-provider';
import { Button } from 'antd';
import moment from 'moment';
import StreamView from 'components-react/highlighter/StreamView';

export default function Highlighter(props: { params?: { view: string } }) {
  const openViewFromParams = props?.params?.view || '';

  const { HighlighterService, RecordingModeService } = Services;
  const v = useVuex(() => ({
    dismissedTutorial: HighlighterService.views.dismissedTutorial,
    useAiHighlighter: HighlighterService.views.useAiHighlighter,
  }));

  const [viewState, setViewState] = useState<IViewState>(
    openViewFromParams === 'stream' || v.dismissedTutorial
      ? { view: 'stream' }
      : { view: 'settings' },
  );

  // TODO: Below is currently always true. Add the handle correctly
  // if (viewState.view !== 'settings' && !v.clips.length && !v.dismissedTutorial && !v.error || ) {
  //   setViewState({ view: 'settings' });
  // }

  switch (viewState.view) {
    case 'settings':
      // TODO: Add show tutorial
      return (
        <>
          {devHeaderBar()}
          <SettingsView
            close={() => {
              HighlighterService.actions.dismissTutorial();
              // TODO
              // setShowTutorial(false);
            }}
          />
        </>
      );

    case 'stream':
      return (
        <>
          <StreamView
            emitSetView={data => {
              setViewFromEmit(data);
            }}
          />
        </>
      );
    case 'clips':
      return (
        <>
          <ClipsView
            emitSetView={data => {
              setViewFromEmit(data);
            }}
            props={{ id: viewState.id }}
          />
        </>
      );
    default:
      return <>DefaultView X{v.useAiHighlighter}X</>; // here it is undefined
  }

  // Dev purposes
  function devHeaderBar() {
    return (
      <>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={() => setView({ view: 'settings' })}>Settings</Button>
          <Button onClick={() => setView({ view: 'stream' })}>stream</Button>
          <Button onClick={() => setView({ view: 'clips', id: undefined })}>clips</Button>
          <Button onClick={() => trimHighlightData()}>create clips</Button>
          <Button onClick={() => setSinfo()}>setSInfo</Button>
          <Button onClick={() => updSinfo()}>updSInfo</Button>
          <Button onClick={() => rmSinfo()}>rmSInfo</Button>
          <Button onClick={async () => HighlighterService.actions.toggleAiHighlighter()}>
            AiHighlighter active: {v.useAiHighlighter.toString()}
          </Button>
        </div>
      </>
    );
  }

  function setSinfo() {
    HighlighterService.actions.addStream({
      id: 'Ninja-streamFortnite5',
      game: 'string',
      title: 'string',
      date: 123,
      state: 'done',
    });
  }

  function updSinfo() {
    HighlighterService.actions.updateStream({
      id: 'Ninja-streamFortnite5',
      game: 'string',
      title: 'string',
      date: 123,
      state: 'rendering',
    });
  }

  function rmSinfo() {
    HighlighterService.actions.removeStream('DJ Naaaardi-Fortnite-5302024');
  }

  function setViewFromEmit(data: IViewState) {
    if (data.view === 'clips') {
      console.log('setViewInOverview:', data.id);
      setView({
        view: data.view,
        id: data.id,
      });
    } else {
      setView({
        view: data.view,
        id: undefined,
      });
    }
  }

  function setView(view: IViewState) {
    setViewState(view);
  }

  async function trimHighlightData() {
    // HighlighterService.actions.flow('das', null);
  }
}
