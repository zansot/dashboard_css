const configureClient = () => createAuth0Client({
  domain: 'butlrtech.us.auth0.com',
  client_id: 'IR0eBGpqN12Qm1CQ4sdUY3y11wIe2Tax',
  cacheLocation: 'localstorage',
  useRefreshTokens: true,
});

window.auth0 = null;

const onAuth = async () => {
  const el = document.getElementById('output');
  el.innerHTML = JSON.stringify(await auth0.getUser(), null, 2);
};
const login = () => auth0.loginWithRedirect({ redirect_uri: window.location.origin });
const logout = () => auth0.logout({ returnTo: window.location.origin });

window.onload = async () => {
  auth0 = await configureClient();

  // check whether use is authed
  const isAuthenticated = await auth0.isAuthenticated();

  // save for later to check login state
  const query = window.location.search;

  // wire up the login button
  // const loginButton = document.getElementById('btn-login');
  // if (loginButton) {
  //   loginButton.disabled = isAuthenticated;
  //   loginButton.addEventListener('click', login);
  // }
  // wire up the logout button
  document.getElementById('btn-logout')
    .addEventListener('click', logout);

  if (isAuthenticated) {
    onAuth();
  } else if (query.includes('code=') && query.includes('state=')) {
    // process the login state
    await auth0.handleRedirectCallback();
    onAuth();

    // use replaceState to remove the querystring parameters
    // FIXME selectively remove code and state
    window.history.replaceState({}, document.title, '/');
  } else {
    login();
  }
};
