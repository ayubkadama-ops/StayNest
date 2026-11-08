const refreshButton = document.querySelector('#refreshDashboard');
const csrfValue = document.querySelector('form[action="/admin/logout/"] input[name="csrfmiddlewaretoken"]')?.value || '';
const section = document.querySelector('.main')?.dataset.adminSection;

function makeAdminForm(actionPath, sectionName) {
  const form = document.createElement('form');
  form.method = 'post';
  form.action = actionPath;
  for (const [name, value] of [['csrfmiddlewaretoken', csrfValue], ['section', sectionName]]) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.append(input);
  }
  return form;
}

function addAdminField(form, labelText, name, value, multiline = false) {
  const label = document.createElement('label');
  label.append(document.createTextNode(labelText));
  const input = document.createElement(multiline ? 'textarea' : 'input');
  input.name = name;
  input.value = value || '';
  if (multiline) {
    input.rows = 5;
    input.maxLength = 20000;
  } else input.maxLength = name === 'subject' ? 255 : 120;
  if (name === 'cidr') input.dataset.validationRule = 'ip-network';
  input.required = true;
  label.append(input);
  form.append(label);
}

if (section === 'settings') {
  const templatesData = document.querySelector('#adminEmailTemplatesData');
  const templatesHeading = [...document.querySelectorAll('h2')].find(node => node.textContent.trim() === 'Email templates');
  const templatesTable = templatesHeading?.parentElement.querySelector('table');
  if (templatesData && templatesTable) {
    const editor = document.createElement('div');
    editor.className = 'settings';
    JSON.parse(templatesData.textContent).forEach(template => {
      const form = makeAdminForm('/admin/action/email-template/', 'settings');
      form.className = 'setting';
      const title = document.createElement('strong');
      title.textContent = template.template_key;
      form.append(title);
      const key = document.createElement('input');
      key.type = 'hidden';
      key.name = 'key';
      key.value = template.template_key;
      form.append(key);
      addAdminField(form, 'Subject', 'subject', template.subject);
      addAdminField(form, 'Body', 'body', template.body, true);
      const save = document.createElement('button');
      save.className = 'button primary';
      save.textContent = 'Save email template';
      form.append(save);
      editor.append(form);
    });
    templatesTable.replaceWith(editor);
  }

  const rulesData = document.querySelector('#adminIpRulesData');
  const rulesHeading = [...document.querySelectorAll('h2')].find(node => node.textContent.trim() === 'Administrator network rules');
  const rulesTable = rulesHeading?.parentElement.querySelector('table');
  if (rulesData && rulesTable) {
    const panel = rulesHeading.parentElement;
    const createForm = makeAdminForm('/admin/action/ip-rule/', 'settings');
    createForm.className = 'setting';
    const formTitle = document.createElement('strong');
    formTitle.textContent = 'Add administrator IP rule';
    createForm.append(formTitle);
    const typeLabel = document.createElement('label');
    typeLabel.append(document.createTextNode('Rule type'));
    const typeSelect = document.createElement('select');
    typeSelect.name = 'rule_type';
    [['allow', 'Allow'], ['deny', 'Deny']].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      typeSelect.append(option);
    });
    typeLabel.append(typeSelect);
    createForm.append(typeLabel);
    addAdminField(createForm, 'IP address or CIDR', 'cidr', '');
    const label = document.createElement('label');
    label.append(document.createTextNode('Label'));
    const labelInput = document.createElement('input');
    labelInput.name = 'label';
    labelInput.maxLength = 120;
    label.append(labelInput);
    createForm.append(label);
    const add = document.createElement('button');
    add.className = 'button primary';
    add.textContent = 'Add rule';
    createForm.append(add);
    panel.insertBefore(createForm, rulesTable);
    const tbody = rulesTable.tBodies[0];
    JSON.parse(rulesData.textContent).forEach(rule => {
      const row = [...tbody.rows].find(candidate => (
        candidate.cells[1]?.textContent.trim() === rule.cidr
        && candidate.cells[0]?.textContent.trim() === rule.rule_type
      ));
      if (!row) return;
      const actionCell = row.insertCell();
      const removeForm = makeAdminForm('/admin/action/ip-rule-delete/', 'settings');
      const id = document.createElement('input');
      id.type = 'hidden';
      id.name = 'id';
      id.value = rule.id;
      removeForm.append(id);
      const button = document.createElement('button');
      button.className = 'button danger';
      button.textContent = 'Delete';
      button.dataset.confirm = 'Delete this IP rule?';
      removeForm.append(button);
      actionCell.append(removeForm);
    });
    rulesTable.rows[0].insertCell().textContent = 'Actions';
  }
}

const userLinks = JSON.parse(document.querySelector('#adminUserLinksData')?.textContent || '[]');
const listingLinks = JSON.parse(document.querySelector('#adminListingLinksData')?.textContent || '[]');
document.querySelectorAll('.table tr').forEach(row => {
  const id = row.querySelector('form input[name="id"]')?.value;
  if (id && section === 'listings') {
    const title = row.cells[0]?.querySelector('strong');
    if (title && !title.querySelector('a')) {
      const link = document.createElement('a');
      link.className = 'user-detail-link';
      link.href = `/admin/listings/${encodeURIComponent(id)}/`;
      while (title.firstChild) link.append(title.firstChild);
      title.append(link);
    }
  } else if (id && section === 'posts') {
    const cell = row.cells[0];
    if (cell && !cell.querySelector('a')) {
      const link = document.createElement('a');
      link.className = 'user-detail-link';
      link.href = `/admin/posts/${encodeURIComponent(id)}/`;
      while (cell.firstChild) link.append(cell.firstChild);
      cell.append(link);
    }
  }
});
const adminTable = document.querySelector('.main .table');
listingLinks.forEach(record => {
  const cell = adminTable?.rows[record.row + 1]?.cells[record.cell];
  if (!cell || cell.querySelector('a')) return;
  const text = cell.querySelector('strong') || cell;
  const link = document.createElement('a');
  link.className = 'user-detail-link';
  link.href = `/admin/listings/${encodeURIComponent(record.id)}/`;
  while (text.firstChild) link.append(text.firstChild);
  text.append(link);
});
userLinks.forEach(record => {
  const row = adminTable?.rows[record.row + 1];
  const cell = row?.cells[record.cell];
  if (!cell) return;
  if (record.append) {
    const note = document.createElement('small');
    note.append(document.createTextNode('Posted by '));
    const link = document.createElement('a');
    link.className = 'user-detail-link';
    link.href = `/admin/users/${encodeURIComponent(record.id)}/`;
    link.textContent = record.labels[0];
    note.append(link);
    cell.append(note);
    return;
  }
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (!record.labels.includes(node.textContent.trim()) || node.parentElement.closest('a')) return;
    const link = document.createElement('a');
    link.className = 'user-detail-link';
    link.href = `/admin/users/${encodeURIComponent(record.id)}/`;
    link.textContent = node.textContent;
    node.replaceWith(link);
  });
});

const refreshStatus = document.querySelector('#refreshStatus');
let hasUnsavedChanges = false;
if (!refreshButton || !refreshStatus) throw new Error('Administrator dashboard refresh controls are unavailable.');
refreshStatus.textContent = `Updated at ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date())} · Auto-refreshes every 30 seconds`;
document.addEventListener('input', event => {
  if (event.target.closest('form')) hasUnsavedChanges = true;
});
document.addEventListener('change', event => {
  if (event.target.closest('form')) hasUnsavedChanges = true;
});
refreshButton.addEventListener('click', () => {
  if (hasUnsavedChanges && !window.confirm('Discard unsaved changes and refresh the dashboard?')) return;
  refreshButton.disabled = true;
  refreshStatus.textContent = 'Refreshing dashboard…';
  window.location.reload();
});
window.setInterval(() => {
  if (document.visibilityState !== 'visible') return;
  if (hasUnsavedChanges || document.activeElement?.matches('input,textarea,select')) {
    refreshStatus.textContent = 'Auto-refresh paused while you edit';
    return;
  }
  window.location.reload();
}, 30000);
