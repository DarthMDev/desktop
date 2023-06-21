import React, { useRef, MouseEvent } from 'react';
import { getPlatformService, TPlatform } from 'services/platforms';
import cx from 'classnames';
import { $t } from 'services/i18n';
import styles from './DualOutputGoLive.m.less';
import { ICustomStreamDestination } from 'services/settings/streaming';
import { Services } from 'components-react/service-provider';
import { SwitchInput } from 'components-react/shared/inputs';
import PlatformLogo from 'components-react/shared/PlatformLogo';
import InfoBadge from 'components-react/shared/InfoBadge';
import DisplaySelector from 'components-react/shared/DisplaySelector';
import { assertIsDefined } from 'util/properties-type-guards';
import { useGoLiveSettings } from '../useGoLiveSettings';
import { alertAsync } from 'components-react/modals';
import Translate from 'components-react/shared/Translate';

interface IUltraDestinationSwitchers {
  type?: 'default' | 'ultra';
}

/**
 * Allows enabling/disabling platforms and custom destinations for the stream
 */
export function UltraDestinationSwitchers(p: IUltraDestinationSwitchers) {
  const {
    enabledPlatforms,
    linkedPlatforms,
    customDestinations,
    toggleDestination,
    togglePlatform,
    isPrimaryPlatform,
    isEnabled,
  } = useGoLiveSettings();
  const enabledPlatformsRef = useRef(enabledPlatforms);
  enabledPlatformsRef.current = enabledPlatforms;

  return (
    <>
      <InfoBadge
        content={
          <Translate message="<dualoutput>Dual Output</dualoutput> is enabled - you must stream to one horizontal and one vertical platform.">
            <u slot="dualoutput" />
          </Translate>
        }
        hasMargin={true}
      />
      {linkedPlatforms.map((platform: TPlatform) => (
        <DestinationSwitcher
          key={platform}
          destination={platform}
          enabled={isEnabled(platform)}
          onChange={enabled => {
            // timeout to allow for switch animation
            setTimeout(() => {
              enabledPlatformsRef.current = togglePlatform(platform, enabled);
            }, 500);
          }}
          isPrimary={isPrimaryPlatform(platform)}
        />
      ))}
      {customDestinations?.map((destination: ICustomStreamDestination, index: number) => (
        <DestinationSwitcher
          key={index}
          destination={destination}
          enabled={customDestinations[index].enabled}
          onChange={enabled => toggleDestination(index, enabled)}
        />
      ))}
    </>
  );
}

interface IDestinationSwitcherProps {
  destination: TPlatform | ICustomStreamDestination;
  enabled: boolean;
  onChange: (enabled: boolean) => unknown;
  isPrimary?: boolean;
}

/**
 * Render a single switcher card
 */
function DestinationSwitcher(p: IDestinationSwitcherProps) {
  const switchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const platform = typeof p.destination === 'string' ? (p.destination as TPlatform) : null;
  const { RestreamService, MagicLinkService } = Services;

  function onClickHandler(ev: MouseEvent) {
    if (p.isPrimary) {
      alertAsync(
        $t(
          'You cannot disable the platform you used to sign in to Streamlabs Desktop. Please sign in with a different platform to disable streaming to this destination.',
        ),
      );
      return;
    }
    if (RestreamService.views.canEnableRestream) {
      const enable = !p.enabled;
      p.onChange(enable);
      // always proxy the click to the SwitchInput
      // so it can play a transition animation
      switchInputRef.current?.click();
      // switch the container class without re-rendering to not stop the animation
      if (enable) {
        containerRef.current?.classList.remove(styles.platformDisabled);
      } else {
        containerRef.current?.classList.add(styles.platformDisabled);
      }
    } else {
      MagicLinkService.actions.linkToPrime('slobs-multistream');
    }
  }

  const { title, description, Switch, Logo } = (() => {
    if (platform) {
      const { UserService } = Services;
      // define slots for a platform switcher
      const service = getPlatformService(platform);
      const platformAuthData = UserService.state.auth?.platforms[platform];
      assertIsDefined(platformAuthData);

      return {
        title: service.displayName,
        description: platformAuthData.username,
        Logo: () => (
          <PlatformLogo platform={platform} className={styles[`platform-logo-${platform}`]} />
        ),
        Switch: () => (
          <SwitchInput
            inputRef={switchInputRef}
            value={p.enabled}
            name={platform}
            disabled={p?.isPrimary}
            uncontrolled
            className={styles.platformSwitch}
            checkedChildren={<i className="icon-check-mark" />}
          />
        ),
      };
    } else {
      // define slots for a custom destination switcher
      const destination = p.destination as ICustomStreamDestination;
      return {
        title: destination.name,
        description: destination.url,
        Logo: () => <i className={cx(styles.destinationLogo, 'fa fa-globe')} />,
        Switch: () => (
          <SwitchInput
            inputRef={switchInputRef}
            value={destination?.enabled}
            name={`destination_${destination?.name}`}
            uncontrolled
            className={styles.platformSwitch}
            checkedChildren={<i className="icon-check-mark" />}
          />
        ),
      };
    }
  })();

  return (
    <div
      ref={containerRef}
      className={cx(styles.platformSwitcher, { [styles.platformDisabled]: !p.enabled })}
    >
      <div className={styles.switcherHeader}>
        <div className={styles.platformInfoWrapper}>
          {/* LOGO */}
          <Logo />
          {/* INFO */}
          <div className={styles.platformInfo}>
            <span className={styles.platformName}>{title}</span>
            <span className={styles.platformUsername}>{description}</span>
          </div>
        </div>
        {/* SWITCH */}
        <div onClick={onClickHandler}>
          <Switch />
        </div>
      </div>
      <div className={styles.platformDisplay}>
        <span className={styles.label}>{`${$t('Output')}:`}</span>
        <DisplaySelector id={title} isPlatform={!!platform} nolabel nomargin />
      </div>
    </div>
  );
}