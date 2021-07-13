// FIXME configure Auth0 to use application corresponding to this clientId
const API_BASE_URL = 'https://7h021chrmj.execute-api.us-west-2.amazonaws.com/prod';
const AUTH0_DOMAIN = 'butlrtech.us.auth0.com';
const AUTH0_CLIENT_ID = 'y0xkRzCkuo8w9CslFjJv5Q0MvVV1vKYB';

const configureClient = () => createAuth0Client({
  domain: AUTH0_DOMAIN,
  client_id: AUTH0_CLIENT_ID,
  cacheLocation: 'localstorage',
  useRefreshTokens: true,
});

let auth0 = null;

/**
 * Log in using Auth0 Universal Login (redirects)
 */
const login = () => auth0.loginWithRedirect({ redirect_uri: window.location.origin });

/**
 * Log out by clearing token from memory and localStorage
 */
const logout = () => auth0.logout({ returnTo: window.location.origin });

/**
 * Get access token from localStorage or Auth0 Client object
 */
const getAccessToken = async () => localStorage.getItem('access_token') || auth0.getTokenSilently();

/**
 *
 */
const auth = async () => {
  auth0 = await configureClient();

  // save for later to check login state
  const query = window.location.search;

  // wire up the logout button
  document.getElementById('btn-logout')
    .addEventListener('click', logout);

  if (query.includes('code=') && query.includes('state=')) {
    // process the login state
    await auth0.handleRedirectCallback();

    // use replaceState to remove the querystring parameters
    // FIXME selectively remove code and state
    window.history.replaceState({}, document.title, '/');
  } else {
    login();
  }
};

function drawCharts() {
  const apiClient = {
    get: async (path, params = {}) => {
      const url = new URL(`${API_BASE_URL}/${path}`);
      url.search = new URLSearchParams(params);
      const token = await getAccessToken();

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.json();
    },
  };

  const getHeadcount = (aggregation) => apiClient.get('/api/v2/headcount', {
    database: localStorage.getItem('database'),
    hive_id: localStorage.getItem('hive_id'),
    aggregation,
  })
    .then((json) => json[aggregation]);

  function drawDailyTrafficChart(labels, values, chartTitle) {
    const ctx = document.getElementById('daily-traffic-chart').getContext('2d');
    const myChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: chartTitle, // Name the series
          data: values,
          backgroundColor: 'rgb(94, 0, 23)',
          hoverBackgroundColor: 'rgb(178, 164, 186)',
          borderColor: 'rgb(94, 0, 23)',
          hoverBorderColor: 'rgb(38, 42, 77)',
          fill: false,
        }],
      },
      options: {
        responsive: true, // Instruct chart js to respond nicely.
        maintainAspectRatio: false, // Add to prevent default behaviour of full-width/height
        scales: {
          xAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: 'Last 24 hours by hour (Update Every 10 Minutes)',
              },
            },
          ],
          yAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: '',
              },
            },
          ],
        },
      },
    });
    return myChart;
  }

  function drawWeeklyTrafficChart(labels, values, chartTitle) {
    const ctx = document.getElementById('weekly-traffic-chart').getContext('2d');
    const myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: chartTitle, // Name the series
          data: values,
          backgroundColor: 'rgb(94, 0, 23)',
          hoverBackgroundColor: 'rgb(178, 164, 186)',
          borderColor: 'rgb(94, 0, 23)',
          hoverBorderColor: 'rgb(38, 42, 77)',
          fill: false,
        }],
      },
      options: {
        responsive: true, // Instruct chart js to respond nicely.
        maintainAspectRatio: false, // Add to prevent default behaviour of full-width/height
        scales: {
          xAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: 'Last 7 days by day (Update Every 10 Minutes)',
              },
            },
          ],
          yAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: '',
              },
            },
          ],
        },
      },
    });
    return myChart;
  }

  const getLabelsAndValues = (res, format = 'YYYY-MM-DD[T]HH:mm:ss[Z]') => {
    const labels = [];
    const values = [];
    for (let i = 0; i < res.in.length; i++) {
      const a = res.in[i];
      const b = res.out[i];
      labels.push(dayjs(a.start).format(format));
      // values.push(a.value - b.value);
      values.push(Math.max(0, a.value - b.value));
    }
    return { labels, values };
  };

  return Promise.all([
    getHeadcount('last_day').then((res) => getLabelsAndValues(res, 'HH:mm')),
    getHeadcount('last_week').then((res) => getLabelsAndValues(res, 'MMM D')),
  ])
    .then(([daily, weekly]) => {
      drawDailyTrafficChart(daily.labels, daily.values, 'All');
      drawWeeklyTrafficChart(weekly.labels, weekly.values, 'All');
    });
}

auth().then(() => drawCharts());
