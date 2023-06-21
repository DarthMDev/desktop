import React, { useRef } from 'react';
import { getPlatformService, TPlatform } from 'services/platforms';
import cx from 'classnames';
import { $t } from 'services/i18n';
import styles from './DualOutputGoLive.m.less';
import { ICustomStreamDestination } from 'services/settings/streaming';
import { Services } from 'components-react/service-provider';
import PlatformLogo from 'components-react/shared/PlatformLogo';
import InfoBadge from 'components-react/shared/InfoBadge';
import DisplaySelector from 'components-react/shared/DisplaySelector';
import { assertIsDefined } from 'util/properties-type-guards';
import { useGoLiveSettings } from '../useGoLiveSettings';
import { alertAsync } from 'components-react/modals';
import Translate from 'components-react/shared/Translate';
import DualOutputPlatformSelector from './DualOutputPlatformSelector';

interface INonUltraDestinationSwitchers {
  showSelector?: boolean;
}

export function NonUltraDestinationSwitchers(p: INonUltraDestinationSwitchers) {
  const {
    enabledPlatforms,
    customDestinations,
    switchPlatforms,
    switchCustomDestination,
    togglePlatform,
    isEnabled,
    isPrimaryPlatform,
  } = useGoLiveSettings();
  const enabledPlatformsRef = useRef(enabledPlatforms);
  enabledPlatformsRef.current = enabledPlatforms;
  const destinationSwitcherRef = useRef({ addClass: () => undefined });

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
      {enabledPlatforms.map((platform: TPlatform) => (
        <DestinationSwitcher
          key={platform}
          destination={platform}
          enabled={isEnabled(platform)}
          onChange={enabled => {
            enabledPlatformsRef.current = togglePlatform(platform, enabled);
          }}
          isPrimary={isPrimaryPlatform(platform)}
        />
      ))}
      {customDestinations
        .map((destination: ICustomStreamDestination, index: number) => ({ ...destination, index }))
        .filter(destination => destination.enabled)
        .map(destination => (
          <DestinationSwitcher
            key={destination.index}
            destination={destination}
            enabled={customDestinations[destination.index].enabled}
            onChange={() => switchCustomDestination(destination.index, false)}
          />
        ))}

      {p.showSelector && (
        <DualOutputPlatformSelector
          showSwitcher={destinationSwitcherRef.current.addClass}
          switchDestination={index => {
            switchCustomDestination(index, true);
            destinationSwitcherRef.current.addClass();
          }}
        />
      )}
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

// disable `func-call-spacing` and `no-spaced-func` rules
// to pass back reference to addClass function
// eslint-disable-next-line
const DestinationSwitcher = React.forwardRef<{ addClass: () => void }, IDestinationSwitcherProps>(
  (p, ref) => {
    React.useImperativeHandle(ref, () => {
      return {
        addClass() {
          addClass();
        },
      };
    });
    const containerRef = useRef<HTMLDivElement>(null);
    const platform = typeof p.destination === 'string' ? (p.destination as TPlatform) : null;

    function addClass() {
      containerRef.current?.classList.remove(styles.platformDisabled);
    }

    function removeClass() {
      if (p.isPrimary) {
        alertAsync(
          $t(
            'You cannot disable the platform you used to sign in to Streamlabs Desktop. Please sign in with a different platform to disable streaming to this destination.',
          ),
        );
        return;
      }
      p.onChange(false);
      containerRef.current?.classList.add(styles.platformDisabled);
    }

    const { title, description, CloseIcon, Logo } = (() => {
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
          CloseIcon: () => <i className={cx('icon-close', styles.close)} onClick={removeClass} />,
        };
      } else {
        // define slots for a custom destination switcher
        const destination = p.destination as ICustomStreamDestination;
        return {
          title: destination.name,
          description: destination.url,
          Logo: () => <i className={cx(styles.destinationLogo, 'fa fa-globe')} />,
          CloseIcon: () => <i className={cx('icon-close', styles.close)} onClick={removeClass} />,
        };
      }
    })();
    return (
      <div className={styles.platformSwitcher}>
        <div
          ref={containerRef}
          className={cx(styles.switcherHeader, {
            [styles.platformDisabled]: !p.enabled,
          })}
        >
          <div className={styles.platformInfoWrapper}>
            {/* LOGO */}
            <Logo />
            {/* INFO */}
            <div className={styles.platformInfo}>
              <span className={styles.platformName}>{title}</span>
              <span className={styles.platformUsername}>{description}</span>
            </div>
            {/* CLOSE */}
            {!p.isPrimary && <CloseIcon />}
          </div>
        </div>
        <div className={styles.platformDisplay}>
          <span className={styles.label}>{`${$t('Output')}:`}</span>
          <DisplaySelector id={title} isPlatform={!!platform} nolabel nomargin />
        </div>
      </div>
    );
  },
);