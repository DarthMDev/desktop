//import styles from '../../../app/windows/go-live/GoLive.m.less';
import { Button, Input, Form, Row, Col } from 'antd';
import React, { useEffect, useState, createContext, useMemo, Suspense } from 'react';
import { Controller, initStore, useController } from '@/store/Controller';
import { api } from '@/api/api.ts';
import { omit } from 'lodash';
import { atomWithObservable } from 'jotai/utils'
import { useAtom, useAtomValue } from 'jotai'

const goLiveSettingsAtom = atom({
  general: {
    title: '',
    description: ''
  },
  platforms: {} as unknown 
})

const streamInfoAtom = atomWithObservable(() => api.StreamingService.state$);

const userInfoAtom = atomWithObservable(() => api.UserService.state$);


function Glw() {
  const lifecycle = useAtomValue(streamInfoAtom).lifecycle;
  const shouldShowSettings = ['waitForNewSettings'].includes(lifecycle);
  const shouldShowChecklist = ['runChecklist', 'live'].includes(lifecycle);
    
  return (
    <Suspense fallback={'Loading...'}>
        {shouldShowChecklist && <GlwSettings key={'settings'} />}
        {shouldShowSettings && <GlwChecklist key={'checklist'} />}
    </Suspense>
  )

}

function GlwSettings() {
  const hasDescription = true;
  const descriptionIsRequired = true;
  const [settings, setSettings] = useAtom(goLiveSettingsAtom);

  return (
    <>
      General Settings

      <Form.Item label="Title" required={true}>
        <Input value={settings.general.title}/>
      </Form.Item>

      {/*DESCRIPTION*/}
      {hasDescription && (
        <Form.Item label="Description" required={descriptionIsRequired}>
          <Input.TextArea rows={4} />
        </Form.Item>
      )}
    </>
  );
}

function GlwChecklist() {
  return <div>Go Live Checklist </div>;
};


class GoLiveController extends Controller {
 // static ctx = createContext<GoLiveController | null>(null);
  store = initStore({
    lifecycle: 'prepopulate',
    settings: {
      general: {
        title: '',
        description: ''
      },
      platforms: {} as unknown 
    },
  });

  streamInfoStore = this.observe(api.StreamingService.state$);
  userStore = this.observe(api.UserService.state$).pick(user => ({ id: user.id, name: user.name }));

  instanceId = Date.now();

  init() {


    console.log('GoLiveController mounted!', this.instanceId);



    // fetch the settings saved in the platforms services and set them in the store
    api.StreamingService.prepopulateInfo().then(settings => {
      console.log('prepopulateInfo', settings);
      this.store.setState(s => {
        s.settings = settings;
      });
    });

    // subscribe to `streamInfoChanged` to keep the store in sync
    const streamInfoSub = api.StreamingService.streamInfoChanged.subscribe(data => {

      // settings on the server side are always `null` except for the case when user is already streaming
      // so we need to omit them from the stream info to avoid overwriting our local settings
      const newStreamInfo = omit(data.state.info, 'settings');

      this.store.setState(s => {
        // console.log('streamInfoChanged!', this.instanceId, newStreamInfo.lifecycle);
        Object.assign(s, newStreamInfo);
      });
    });


    // return the dispose function that cleanups the subscription
    return () => [streamInfoSub].forEach(sub => sub.unsubscribe());
  }

}




export default function GoLiveWindow() {
    console.log('RENDER GoLiveWindowV2');
    const { store, userStore } = useController(GoLiveController);
  const lifecycle = store.useSelector(s => s.lifecycle);
  const user = userStore.useStateValue();
  const isLoading = lifecycle === 'prepopulate' || lifecycle === 'empty';

  const shouldShowSettings = ['waitForNewSettings'].includes(lifecycle);
  const shouldShowChecklist = ['runChecklist', 'live'].includes(lifecycle);

  // useEffect(() => {{ return () => {
  //   console.log('unmounting GoLiveWindow!');
  // }}}, []);

  return (
    <Form
      layout="vertical"
      name="editStreamForm"
    >
        {lifecycle}
        {isLoading && <div>Loading...</div>}

      {/* STEP 1 - SELECT PLATFORMS TO STREAM AND FILL OUT THEIR SETTINGS */}
      {shouldShowSettings && <GoLiveSettings key={'settings'} />}

      {/* STEP 2 - RUN THE CHECKLIST */}
      {shouldShowChecklist && <GoLiveChecklist key={'checklist'} />}
    </Form>
  );
}

function ModalFooter() {
  return <Button>Confirm & Go Live</Button>;
}

function GoLiveSettings() {
    const { store } = useController(GoLiveController);
    const platforms = store.useSelector(s => s.settings?.platforms);
    return <>
      <h1>Go Live Settings 1</h1>
      <Row gutter={[16, 16]}>
        <Col span={8}>13
          <GeneralSettings />
        </Col>
        <Col span={16}>
          <Destinations />
        </Col>
      </Row>
    </>;
}

function GeneralSettings() {
  const hasDescription = true;
  const descriptionIsRequired = true;
  const [description, setDescription] = useState('');

  return (
    <>
      General Settings

      <Form.Item label="Title" required={true}>
        <Input />
      </Form.Item>

      {/*DESCRIPTION*/}
      {hasDescription && (
        // <TextAreaInput
        //   value={description}
        //   onChange={val => setDescription(val)}
        //   name="description"
        //   label="'Description"
        //   required={descriptionIsRequired}
        // />
        <Form.Item label="Description" required={descriptionIsRequired}>
          <TextArea rows={4} />
        </Form.Item>
      )}
    </>
  );
}

function Destinations() {
  const { store } = useController(GoLiveController);
  const platforms = store.useSelector(s => s.settings!.platforms);
  return (
    <div>
      Destinations
      <pre>{JSON.stringify(platforms, null, 2)}</pre>
    </div>
  );
}

function GoLiveChecklist() {
  return <div>Go Live Checklist </div>;
}
function atom(arg0: {}) {
  throw new Error('Function not implemented.');
}

