function _normalizeUserEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function renderUsuarios() {
  if (!userCan('users:manage')) {
    document.getElementById('contentArea').innerHTML = `<h3>Acesso negado. Apenas administradores.</h3>`;
    return;
  }

  const users = appState.users || [];
  document.getElementById('contentArea').innerHTML = `
    <div class="pg-header">
      <div>
        <div class="pg-eyebrow">Sistema</div>
        <h1 class="pg-title">Gestão de Usuários</h1>
      </div>
      <button class="btn btn-white" onclick="_refreshUsuarios()">Atualizar</button>
    </div>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Email</th>
            <th>Nível</th>
            <th style="text-align:right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td><div class="fw-700">${_userEsc(u.name)}</div></td>
              <td>${_userEsc(u.email)}</td>
              <td>
                <span class="status-badge ${normalizeUserRole(u.role) === 'admin' ? 'badge-batch' : normalizeUserRole(u.role) === 'compras' ? 'badge-pending' : 'badge-done'}">
                  ${_userEsc(roleLabel(u.role).toUpperCase())}
                </span>
                <div style="font-size:11px; color:var(--text-400); margin-top:4px;">${_userEsc(roleDescription(u.role))}</div>
              </td>
              <td style="text-align:right;">
                <button class="btn btn-white btn-sm" onclick="_editUserModal('${u.id}')">Editar</button>
                <button class="btn btn-white btn-sm" style="color:var(--red);" onclick="_deleteUser('${u.id}')">Remover</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function _novoUsuarioModal() {
  openModal("Novo Usuário", `
    <p style="font-size:13px; color:var(--text-500); line-height:1.5;">
      A criação de usuários foi bloqueada nesta tela para evitar senhas em texto puro. Crie o usuário no Supabase Auth e vincule um perfil em <code>unilux_users</code>.
    </p>
  `, `
    <button class="btn btn-dark" onclick="closeModal()">Fechar</button>
  `);
}

async function _refreshUsuarios() {
  if (!requirePermission('users:manage')) return;
  await DB.init(APP_MOCK);
  renderUsuarios();
}

async function _saveNewUser() {
  showToast("Criação pelo navegador desativada.", "error");
}

function _editUserModal(id) {
  if (!requirePermission('users:manage')) return;
  const u = appState.users.find(x => x.id === id);
  if (!u) return;
  const currentRole = normalizeUserRole(u.role);

  openModal(`Editar Usuário: ${u.name}`, `
    <div class="form-group">
      <label class="form-label">Nome Completo</label>
      <input type="text" id="uNameEdit" class="form-control" value="${_userEscAttr(u.name)}">
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input type="email" id="uEmailEdit" class="form-control" value="${_userEscAttr(u.email)}" disabled>
    </div>
    <div class="form-group">
      <label class="form-label">Nível de Acesso</label>
      <select id="uRoleEdit" class="form-control">
        ${roleOptions().map(role => `
          <option value="${_userEscAttr(role.value)}" ${currentRole === role.value ? 'selected' : ''}>${_userEsc(role.label)} — ${_userEsc(role.description)}</option>
        `).join('')}
      </select>
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-green" onclick="_saveEditedUser('${id}')">Salvar Alterações</button>
  `);
}

async function _saveEditedUser(id) {
  try {
    if (!requirePermission('users:manage')) return;
    const u = appState.users.find(x => x.id === id);
    if (!u) return;

    const name = document.getElementById('uNameEdit').value.trim();
    const role = normalizeUserRole(document.getElementById('uRoleEdit').value);

    if (!name) { showToast("Preencha o Nome!", "error"); return; }

    u.name = name;
    u.role = role;

    await DB.saveUser(u);
    await DB.log("Editou usuário", "unilux_users", `${u.name} (${u.role})`);
    
    showToast("Usuário atualizado!", "success");
    closeModal();
    renderUsuarios();
  } catch (err) {
    showToast("Erro ao atualizar. Tente novamente.", "error");
  }
}

async function _deleteUser(id) {
  if (!requirePermission('users:manage')) return;
  if (appState.currentUser?.id === id) {
    showToast("Não remova o próprio acesso ativo.", "error");
    return;
  }
  if (confirm("Deseja realmente remover este acesso?")) {
    await DB.deleteUser(id);
    await DB.log("Removeu usuário", "unilux_users", id);
    showToast("Usuário removido.");
    await DB.init(); // Refresh
    renderUsuarios();
  }
}

function _userEsc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function _userEscAttr(value) {
  return _userEsc(value);
}
