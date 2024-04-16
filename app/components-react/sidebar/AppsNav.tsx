import React from 'react';
import styles from './SideNav.module.less';
import { useVuex } from 'components-react/hooks';
import { $t } from 'services/i18n';
import { Services } from 'components-react/service-provider';
import MenuItem from 'components-react/shared/MenuItem';
import { EAppPageSlot } from 'services/platform-apps';
import { Menu } from '../../util/menus/Menu';
import cx from 'classnames';
interface IAppsNav {
  type?: 'enabled' | 'selected';
}

export default function AppsNav(p: IAppsNav) {
  const { NavigationService, PlatformAppsService, SideNavService } = Services;
  const { type = 'selected' } = p;

  const { currentMenuItem, apps, isOpen, navigateApp, enabledApps } = useVuex(() => ({
    currentMenuItem: SideNavService.views.currentMenuItem,
    apps: SideNavService.views.apps,
    isOpen: SideNavService.views.isOpen,
    navigateApp: NavigationService.actions.navigateApp,
    enabledApps: PlatformAppsService.views.enabledApps
      .filter(app => {
        return !!app?.manifest?.pages.find(page => {
          return page.slot === EAppPageSlot.TopNav;
        });
      })
      .sort((a, b) => (a.manifest?.name > b.manifest?.name ? 1 : -1)),
  }));

  function iconSrc(appId: string, path: string) {
    return PlatformAppsService.views.getAssetUrl(appId, path) || undefined;
  }

  /**
   * Handle pop out app window
   */

  function isPopOutAllowed(appId: string) {
    const app = enabledApps.find(app => app.id === appId);
    const topNavPage = app?.manifest.pages.find(page => page.slot === EAppPageSlot.TopNav);
    if (!topNavPage) return false;

    // Default result is true
    return topNavPage.allowPopout == null ? true : topNavPage.allowPopout;
  }

  function popOut(appId: string) {
    if (!isPopOutAllowed(appId)) return;
    PlatformAppsService.actions.popOutAppPage(appId, EAppPageSlot.TopNav);
  }

  function showContextMenu(e: React.MouseEvent, appId: string) {
    e.preventDefault();
    e.stopPropagation();

    if (!isPopOutAllowed(appId)) return;

    const menu = new Menu();
    menu.append({
      label: $t('Pop Out'),
      click: () => popOut(appId),
    });
    menu.popup();
  }

  return type === 'selected' ? (
    <>
      {apps.map(
        app =>
          app &&
          app?.isActive && (
            <MenuItem
              key={app?.id}
              className={cx(
                !isOpen && styles.closed,
                isOpen && styles.open,
                currentMenuItem === app?.id && styles.active,
              )}
              title={app?.name}
              icon={
                app?.icon && app?.id ? (
                  <img src={iconSrc(app?.id, app?.icon)} className={styles.appIcons} />
                ) : (
                  <i className="icon-integrations" />
                )
              }
              onClick={() => app?.id && navigateApp(app?.id)}
              type="app"
              onContextMenu={e => showContextMenu(e, app?.id)}
              draggable
              onDragEnd={() => popOut(app?.id)}
            >
              {app?.name}
            </MenuItem>
          ),
      )}
    </>
  ) : (
    <>
      {enabledApps.map(
        app =>
          app && (
            <MenuItem
              key={`sub-${app?.id}`}
              className={cx(
                styles.appMenuItem,
                currentMenuItem === `sub-${app?.id}` && styles.active,
              )}
              title={app.manifest?.name}
              onClick={() => app?.id && navigateApp(app?.id, `sub-${app?.id}`)}
              type="submenu"
              onContextMenu={e => showContextMenu(e, app?.id)}
              draggable
              onDragEnd={() => popOut(app?.id)}
            >
              {app.manifest?.name}
            </MenuItem>
          ),
      )}
    </>
  );
}
