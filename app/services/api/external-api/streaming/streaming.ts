import { StreamingService as InternalStreamingService } from 'services/streaming';
import { Inject } from 'services/core/injector';
import { Fallback, Singleton } from 'services/api/external-api';
import { Observable } from 'rxjs';
import { ISerializable } from 'services/api/rpc-api';

/**
 * Possible streaming states.
 */
enum EStreamingState {
  Offline = 'offline',
  Starting = 'starting',
  Live = 'live',
  Ending = 'ending',
  Reconnecting = 'reconnecting',
}

/**
 * Possible recording states.
 * @remark For consistency with the values in the new API, the properties `start` and `stop` are added.
 * The old API has some different values. Because we use the old API for single output and the new API
 * for dual output, we currently keep both as options. After fully migrating to the new API, the old API
 * values will be removed.
 */
enum ERecordingState {
  Offline = 'offline',
  Starting = 'starting',
  Start = 'start',
  Recording = 'recording',
  Stopping = 'stopping',
  Stop = 'stop',
  Wrote = 'wrote',
}

/**
 * Possible replay buffer states.
 */
enum EReplayBufferState {
  Running = 'running',
  Stopping = 'stopping',
  Offline = 'offline',
  Saving = 'saving',
}

/**
 * Serialized representation of {@link StreamingService}. Includes
 * streaming, recording and replay buffer state representation.
 */
interface IStreamingState {
  streamingStatus: EStreamingState;
  streamingStatusTime: string;
  recordingStatus: ERecordingState;
  recordingStatusTime: string;
  replayBufferStatus: EReplayBufferState;
  replayBufferStatusTime: string;
}

/**
 * API for streaming, recording and replay buffer management. Provides
 * operations like starting and stopping streaming and recording and allows
 * watching for streaming status.
 */
@Singleton()
export class StreamingService implements ISerializable {
  @Fallback()
  @Inject()
  protected streamingService: InternalStreamingService;

  /**
   * Observable event that is triggered whenever the the streaming state changes.
   * The observed value determines the current streaming state and is represented
   * by {@link EStreamingState}.
   *
   * @see EStreamingState
   */
  get streamingStatusChange(): Observable<EStreamingState> {
    return this.streamingService.streamingStatusChange;
  }

  /**
   * Observable event that is triggered whenever the the recording state changes.
   * The observed value determines the current recording state and is represented
   * by {@link ERecordingState}.
   *
   * @see ERecordingState
   */
  get recordingStatusChange(): Observable<ERecordingState> {
    return this.streamingService.recordingStatusChange;
  }

  /**
   * Observable event that is triggered whenever the the replay buffer state
   * changes. The observed value determines the current replay buffer state and
   * is represented by {@link EReplayBufferState}.
   *
   * @see EReplayBufferState
   */
  get replayBufferStatusChange(): Observable<EReplayBufferState> {
    return this.streamingService.replayBufferStatusChange;
  }

  /**
   * Returns The current streaming, recording and replay buffer state
   * represented.
   *
   * @returns A serialized representation of {@link StreamingService}
   */
  getModel(): IStreamingState {
    return this.streamingService.getModel();
  }

  /**
   * Toggles recording.
   */
  toggleRecording(): void {
    return this.streamingService.toggleRecording();
  }

  /**
   * Toggles streaming.
   */
  toggleStreaming(): Promise<never> | Promise<void> {
    return this.streamingService.toggleStreaming();
  }

  /**
   * Starts replay buffer.
   */
  startReplayBuffer(): void {
    return this.streamingService.startReplayBuffer();
  }

  /**
   * Stops replay buffer.
   */
  stopReplayBuffer(): void {
    return this.streamingService.stopReplayBuffer();
  }

  /**
   * Saves replay.
   */
  saveReplay(): void {
    return this.streamingService.saveReplay();
  }
}
