(() => {
  'use strict';

  // Remove the private credential before any API request or UI work.
  function takeLoginKey() {
    const key = new URLSearchParams(window.location.hash.slice(1)).get('key');
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    return key;
  }
  let loginKey = takeLoginKey();

  const API = '/blog/write/api';
  const SIGN_IN = 'Open your private Ajew Blog Writer shortcut to sign in.';
  const byId = (id) => document.getElementById(id);
  const ui = Object.fromEntries([
    'auth-panel', 'auth-message', 'retry-session', 'workspace', 'logout',
    'feedback', 'error', 'post-form', 'post-title', 'post-body', 'title-count',
    'body-count', 'editor-heading', 'post-state', 'save-state', 'publication-note',
    'public-link', 'new-post', 'save-draft', 'publish', 'post-list', 'list-message',
    'refresh-posts', 'conflict-panel', 'save-copy'
  ].map((id) => [id, byId(id)]));
  const state = {
    authenticated: false, busy: false, post: null, pendingId: null, posts: [],
    savedTitle: '', savedBody: '', conflict: false
  };

  function dirty() {
    return ui['post-title'].value !== state.savedTitle || ui['post-body'].value !== state.savedBody;
  }

  function published(post) {
    return Boolean(post && (Number(post.published_version) > 0 || post.published_at));
  }

  function changedSincePublication(post) {
    return published(post) && post.version !== post.published_version;
  }

  function notice(message, isError = false) {
    ui.feedback.hidden = true;
    ui.error.hidden = true;
    const target = isError ? ui.error : ui.feedback;
    target.textContent = message;
    target.hidden = !message;
  }

  function showSignIn(message = SIGN_IN) {
    state.authenticated = false;
    ui['auth-panel'].hidden = false;
    ui['auth-message'].textContent = message;
    ui['retry-session'].hidden = false;
    ui.logout.hidden = true;
    // An expired session must not destroy text that the author needs to copy.
    updateControls();
  }

  async function request(path, method = 'GET', payload) {
    const options = {
      method, credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json' }
    };
    if (method !== 'GET') {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload === undefined ? {} : payload);
    }
    let response;
    try {
      response = await fetch(API + path, options);
    } catch {
      throw new Error('Could not reach the writer. Your text is still here. Check your connection; the server may have received the request. Refresh Your posts to check before retrying.');
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('The writer returned an unexpected response. Your text has not been replaced. Please try again.');
    }
    if (!response.ok) {
      const error = new Error(typeof data.error === 'string' ? data.error : 'The request could not be completed.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function handleError(error) {
    if (error.status === 401) {
      showSignIn(SIGN_IN + ' Your text is still in the editor; copy any unsaved changes before reopening your shortcut.');
      notice('Your session has ended. Nothing in the editor has been replaced.', true);
    } else if (error.status === 409) {
      state.conflict = true;
      notice('This post changed in another session. Your text has not been replaced. Save a separate draft below, or copy your changes before reopening the saved post.', true);
    } else {
      notice(error.message || 'Something went wrong. Your text has not been replaced.', true);
    }
    updateControls();
  }

  function publicURL(value) {
    if (!value || typeof value !== 'string') return null;
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/blog/') || url.pathname.startsWith('/blog/write/')) return null;
      return url.href;
    } catch {
      return null;
    }
  }

  function updateControls() {
    const locked = state.busy || !state.authenticated;
    for (const name of ['new-post', 'save-draft', 'publish', 'refresh-posts', 'save-copy']) {
      ui[name].disabled = locked;
    }
    ui.logout.disabled = state.busy;
    ui['retry-session'].disabled = state.busy;
    ui['post-title'].readOnly = locked;
    ui['post-body'].readOnly = locked;
    ui['workspace'].setAttribute('aria-busy', String(state.busy));
    ui['post-list'].querySelectorAll('button').forEach((button) => { button.disabled = locked; });
    ui['conflict-panel'].hidden = !state.conflict;
    if (state.conflict) {
      ui['save-draft'].disabled = true;
      ui.publish.disabled = true;
    }
    ui['title-count'].textContent = ui['post-title'].value.length.toLocaleString() + ' / 300';
    ui['body-count'].textContent = ui['post-body'].value.length.toLocaleString() + ' / 200,000';
    ui['save-state'].textContent = state.busy ? 'Working…' : dirty() ? 'Unsaved changes' : state.post ? 'Saved' : 'Not saved yet';
    const live = published(state.post);
    const updates = live && (dirty() || changedSincePublication(state.post));
    ui['post-state'].textContent = updates ? 'Unpublished changes' : live ? 'Published' : 'Private draft';
    ui['post-state'].dataset.state = updates ? 'changes' : live ? 'published' : 'draft';
    ui['publication-note'].textContent = live
      ? 'Save Draft keeps your edits private and leaves the live post unchanged. Publish updates the public version.'
      : 'Your draft is private. Only Publish makes it public.';
    const url = live ? publicURL(state.post.url) : null;
    ui['public-link'].hidden = !url;
    if (url) ui['public-link'].href = url;
    else ui['public-link'].removeAttribute('href');
  }

  function setBusy(value) {
    state.busy = value;
    updateControls();
  }

  function canLeave(message = 'Discard your unsaved changes? Choose Cancel to keep writing, or save your draft first.') {
    if (state.busy) {
      notice('Please wait for the current request to finish before leaving.', true);
      return false;
    }
    return !dirty() || window.confirm(message);
  }

  function renderList() {
    ui['post-list'].replaceChildren();
    for (const post of state.posts) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'post-choice';
      button.disabled = state.busy || !state.authenticated;
      if (state.post && post.id === state.post.id) button.setAttribute('aria-current', 'true');
      const title = document.createElement('strong');
      title.className = 'post-title';
      title.dir = 'auto';
      title.textContent = post.title || 'Untitled draft';
      const summary = document.createElement('span');
      summary.className = 'post-summary';
      let label = published(post) ? changedSincePublication(post) ? 'Unpublished changes' : 'Published' : 'Private draft';
      const date = new Date(post.updated_at);
      if (post.updated_at && !Number.isNaN(date.getTime())) label += ' · ' + date.toLocaleDateString();
      summary.textContent = label;
      button.append(title, summary);
      button.addEventListener('click', () => openPost(post.id));
      item.append(button);
      ui['post-list'].append(item);
    }
    ui['list-message'].textContent = 'No saved posts yet. Write your first post, then choose Save Draft.';
    ui['list-message'].hidden = state.posts.length > 0;
  }

  function keepPost(post) {
    state.posts = [post, ...state.posts.filter((item) => item.id !== post.id)];
    renderList();
  }

  function selectPost(post) {
    state.post = post;
    state.pendingId = post ? post.id : null;
    state.savedTitle = post ? post.title : '';
    state.savedBody = post ? post.body : '';
    state.conflict = false;
    ui['post-title'].value = state.savedTitle;
    ui['post-body'].value = state.savedBody;
    ui['post-title'].setCustomValidity('');
    ui['post-body'].setCustomValidity('');
    ui['editor-heading'].textContent = post ? 'Edit post' : 'New post';
    renderList();
    updateControls();
  }

  async function loadPosts() {
    const data = await request('/posts');
    if (!Array.isArray(data.posts)) throw new Error('The posts list could not be read. Please try Refresh.');
    state.posts = data.posts;
    renderList();
  }

  async function openPost(id) {
    if (!state.authenticated || !canLeave()) return;
    setBusy(true);
    notice('');
    try {
      const data = await request('/posts/' + encodeURIComponent(id));
      selectPost(data.post || data);
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
    ui['editor-heading'].focus();
  }

  function validFields() {
    const title = ui['post-title'];
    const body = ui['post-body'];
    title.setCustomValidity(title.value.trim() ? (title.value.length <= 300 ? '' : 'Use a title of 300 characters or fewer.') : 'Please add a title.');
    body.setCustomValidity(body.value.trim() ? (body.value.length <= 200000 ? '' : 'Use content of 200,000 characters or fewer.') : 'Please add some content.');
    return ui['post-form'].reportValidity();
  }

  async function saveCurrent() {
    if (state.post && !dirty()) return state.post;
    if (!state.pendingId) state.pendingId = crypto.randomUUID().replaceAll('-', '');
    const data = await request('/posts', 'POST', {
      id: state.pendingId,
      title: ui['post-title'].value,
      body: ui['post-body'].value,
      version: state.post ? state.post.version : 0
    });
    state.post = data.post;
    state.savedTitle = data.post.title;
    state.savedBody = data.post.body;
    state.conflict = false;
    ui['editor-heading'].textContent = 'Edit post';
    keepPost(data.post);
    updateControls();
    return data.post;
  }

  async function saveDraft(asCopy = false) {
    if (state.busy || !state.authenticated || !validFields()) return;
    setBusy(true);
    notice('');
    try {
      if (asCopy) {
        state.post = null;
        state.pendingId = null;
        state.savedTitle = '';
        state.savedBody = '';
        state.conflict = false;
      }
      const post = await saveCurrent();
      notice(published(post) ? 'Draft saved. Your live post is unchanged; Publish when you are ready to update it.' : 'Draft saved. It is private and has not been published.');
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  async function publishPost() {
    if (state.busy || !state.authenticated || state.conflict || !validFields()) return;
    setBusy(true);
    notice('');
    try {
      const post = await saveCurrent();
      const message = published(post)
        ? 'Publish these changes publicly? They will replace the current live version.'
        : 'Publish this post publicly on Ajew Blog? Anyone will be able to read it.';
      if (!window.confirm(message + '\n\n' + post.title + '\n\nChoose OK to publish, or Cancel to keep it as a saved draft.')) {
        notice(published(post) ? 'Publication canceled. Your draft is saved; the live post is unchanged.' : 'Publication canceled. Your draft is saved and remains private.');
        return;
      }
      const data = await request('/posts/' + encodeURIComponent(post.id) + '/publish', 'POST', { version: post.version });
      state.post = data.post;
      if (data.url) state.post.url = data.url;
      keepPost(state.post);
      notice('Published. Your post is public. Use “View published post” to read it.');
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    setBusy(true);
    notice('');
    try {
      if (loginKey !== null) {
        // Only the request receives the key. Do not retain it across the await.
        const login = request('/login', 'POST', { key: loginKey });
        loginKey = null;
        const result = await login;
        if (!result.ok) throw new Error('Sign-in failed.');
      } else {
        const result = await request('/session');
        if (!result.authenticated) throw new Error('Sign-in required.');
      }
      state.authenticated = true;
      ui['auth-panel'].hidden = true;
      ui.workspace.hidden = false;
      ui.logout.hidden = false;
      try {
        await loadPosts();
      } catch (error) {
        ui['list-message'].textContent = 'Your posts could not be loaded. Choose Refresh to try again.';
        ui['list-message'].hidden = false;
        handleError(error);
      }
    } catch {
      // Never reflect login responses: they may contain sensitive information.
      loginKey = null;
      showSignIn();
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!canLeave('Sign out and discard unsaved changes? Your saved drafts will still be here when you return.')) return;
    setBusy(true);
    notice('');
    try {
      await request('/logout', 'POST', {});
      state.posts = [];
      selectPost(null);
      ui.workspace.hidden = true;
      showSignIn();
      notice('Signed out. Your saved drafts remain private.');
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  for (const field of [ui['post-title'], ui['post-body']]) {
    field.addEventListener('input', () => {
      field.setCustomValidity('');
      notice('');
      updateControls();
    });
  }
  ui['post-form'].addEventListener('submit', (event) => { event.preventDefault(); saveDraft(); });
  ui.publish.addEventListener('click', publishPost);
  ui['save-copy'].addEventListener('click', () => saveDraft(true));
  ui['new-post'].addEventListener('click', () => {
    if (!canLeave()) return;
    selectPost(null);
    notice('');
    ui['post-title'].focus();
  });
  ui['refresh-posts'].addEventListener('click', async () => {
    if (state.busy || !state.authenticated) return;
    setBusy(true);
    try {
      await loadPosts();
      notice('Your posts list is up to date. Text in the editor has not been replaced.');
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  });
  ui.logout.addEventListener('click', signOut);
  ui['retry-session'].addEventListener('click', signIn);
  document.querySelectorAll('[data-leave]').forEach((link) => {
    link.addEventListener('click', (event) => { if (!canLeave()) event.preventDefault(); });
  });
  window.addEventListener('beforeunload', (event) => {
    if (!dirty() && !state.busy) return;
    event.preventDefault();
    event.returnValue = '';
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) signIn();
  });
  window.addEventListener('hashchange', () => {
    const key = takeLoginKey();
    if (key === null) return;
    if (state.busy) {
      notice('Please wait for the current request, then reopen your private shortcut.', true);
      return;
    }
    loginKey = key;
    signIn();
  });
  signIn();
})();
