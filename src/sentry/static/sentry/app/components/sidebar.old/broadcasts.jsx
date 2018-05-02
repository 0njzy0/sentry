import PropTypes from 'prop-types';
import React from 'react';

import createReactClass from 'create-react-class';

import ApiMixin from 'app/mixins/apiMixin';
import LoadingIndicator from 'app/components/loadingIndicator';
import {t} from 'app/locale';

import SidebarPanel from 'app/components/sidebar.old/sidebarPanel';
import SidebarPanelItem from 'app/components/sidebar.old/sidebarPanelItem';

const MARK_SEEN_DELAY = 1000;
const POLLER_DELAY = 60000;

const Broadcasts = createReactClass({
  displayName: 'Broadcasts',

  propTypes: {
    showPanel: PropTypes.bool,
    currentPanel: PropTypes.string,
    hidePanel: PropTypes.func,
    onShowPanel: PropTypes.func.isRequired,
  },

  mixins: [ApiMixin],

  getInitialState() {
    return {
      broadcasts: [],
      loading: true,
      error: false,
    };
  },

  componentWillMount() {
    this.fetchData();
  },

  componentWillUnmount() {
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.poller) {
      window.clearTimeout(this.poller);
      this.poller = null;
    }
  },

  remountComponent() {
    this.setState(this.getInitialState(), this.fetchData);
  },

  fetchData() {
    if (this.poller) {
      window.clearTimeout(this.poller);
    }
    this.api.request('/broadcasts/', {
      method: 'GET',
      success: data => {
        this.setState({
          broadcasts: data || [],
          loading: false,
        });
        this.poller = window.setTimeout(this.fetchData, POLLER_DELAY);
      },
      error: () => {
        this.setState({
          loading: false,
          error: true,
        });
        this.poller = window.setTimeout(this.fetchData, POLLER_DELAY);
      },
    });
  },

  onShowPanel() {
    this.timer = window.setTimeout(this.markSeen, MARK_SEEN_DELAY);
    this.props.onShowPanel();
  },

  getUnseenIds() {
    return this.state.broadcasts
      .filter(item => {
        return !item.hasSeen;
      })
      .map(item => {
        return item.id;
      });
  },

  markSeen() {
    let unseenBroadcastIds = this.getUnseenIds();
    if (unseenBroadcastIds.length === 0) return;

    this.api.request('/broadcasts/', {
      method: 'PUT',
      query: {id: unseenBroadcastIds},
      data: {
        hasSeen: '1',
      },
      success: () => {
        this.setState({
          broadcasts: this.state.broadcasts.map(item => {
            item.hasSeen = true;
            return item;
          }),
        });
      },
    });
  },

  render() {
    let {broadcasts, loading} = this.state;
    return (
      <li className={this.props.currentPanel == 'broadcasts' ? 'active' : null}>
        <a
          className="broadcasts-toggle"
          onClick={this.onShowPanel}
          title={t('Updates from Sentry')}
        >
          <span className="icon icon-globe" />
          {this.getUnseenIds() > 0 && <span className="activity-indicator" />}
        </a>
        {this.props.showPanel &&
          this.props.currentPanel == 'broadcasts' && (
            <SidebarPanel
              title={t('Recent updates from Sentry')}
              hidePanel={this.props.hidePanel}
            >
              {loading ? (
                <LoadingIndicator />
              ) : broadcasts.length === 0 ? (
                <div className="sidebar-panel-empty">
                  {t('No recent updates from the Sentry team.')}
                </div>
              ) : (
                broadcasts.map(item => {
                  return (
                    <SidebarPanelItem
                      key={item.id}
                      className={!item.hasSeen && 'unseen'}
                      title={item.title}
                      message={item.message}
                      link={item.link}
                    />
                  );
                })
              )}
            </SidebarPanel>
          )}
      </li>
    );
  },
});

export default Broadcasts;