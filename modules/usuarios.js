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
      <div style="display:flex;gap:8px;">
        <button class="btn btn-white" onclick="_refreshUsuarios()">Atualizar</button>
        <button class="btn btn-dark" onclick="_novoUsuarioModal()">+ Novo Usuário</button>
      </div>
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
                <span class="status-badge ${_userRoleBadgeClass(normalizeUserRole(u.role))}">
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

function _userRoleBadgeClass(role) {
  switch (role) {
    case 'admin':      return 'badge-batch';
    case 'compras':    return 'badge-pending';
    case 'compras_pcp':return 'badge-info';
    case 'pcp':        return 'badge-done';
    default:           return 'badge-neutral';
  }
}

function _novoUsuarioModal() {
  if (!requirePermission('users:manage')) return;

  const roleOptHtml = roleOptions().map(role =>
    `<option value="${_userEscAttr(role.value)}">${_userEsc(role.label)} — ${_userEsc(role.description)}</option>`
  ).join('');

  openModal('Novo Usuário', `
    <div class="form-group">
      <label class="form-label">Nome Completo</label>
      <input type="text" id="uNameNew" class="form-control" placeholder="Ex: João da Silva" maxlength="120" autocomplete="off">
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input type="email" id="uEmailNew" class="form-control" placeholder="email@empresa.com" maxlength="120" autocomplete="off" inputmode="email" autocapitalize="none" spellcheck="false">
    </div>
    <div class="form-group">
      <label class="form-label">Senha</label>
      <input type="password" id="uPassNew" class="form-control" placeholder="Mínimo 6 caracteres" maxlength="128" autocomplete="new-password">
    </div>
    <div class="form-group">
      <label class="form-label">Confirmar Senha</label>
      <input type="password" id="uPassNewConfirm" class="form-control" placeholder="Repita a senha" maxlength="128" autocomplete="new-password">
    </div>
    <div class="form-group">
      <label class="form-label">Nível de Acesso</label>
      <select id="uRoleNew" class="form-control">
        ${roleOptHtml}
      </select>
    </div>
    <div id="uNewUserError" style="display:none; color:var(--red); font-size:13px; margin-top:8px;"></div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-dark" id="uNewUserSaveBtn" onclick="_saveNewUser()">Criar Usuário</button>
  `);
}

async function _saveNewUser() {
  if (!requirePermission('users:manage')) return;

  const name   = (document.getElementById('uNameNew')?.value || '').trim();
  const email  = _normalizeUserEmail(document.getElementById('uEmailNew')?.value || '');
  const pass   = document.getElementById('uPassNew')?.value || '';
  const pass2  = document.getElementById('uPassNewConfirm')?.value || '';
  const role   = document.getElementById('uRoleNew')?.value || 'pcp';
  const errEl  = document.getElementById('uNewUserError');
  const saveBtn = document.getElementById('uNewUserSaveBtn');

  function showErr(msg) {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
  }

  if (!name)  { showErr('Preencha o Nome Completo.'); return; }
  if (!email) { showErr('Preencha o Email.'); return; }
  if (!pass)  { showErr('Preencha a Senha.'); return; }
  if (pass.length < 6) { showErr('A senha deve ter no mínimo 6 caracteres.'); return; }
  if (pass !== pass2) { showErr('As senhas não coincidem.'); return; }

  // Verifica se e-mail já existe localmente
  const emailJaExiste = (appState.users || []).some(u => _normalizeUserEmail(u.email) === email);
  if (emailJaExiste) { showErr('Já existe um usuário com este e-mail.'); return; }

  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Criando...'; }
  if (errEl) errEl.style.display = 'none';

  try {
    const newProfile = await DB.createUser(name, email, pass, role);
    if (newProfile) appState.users = [...(appState.users || []), newProfile];
    await DB.log('Criou usuário', 'unilux_users', `${name} (${role})`);
    showToast(`Usuário "${name}" criado com sucesso!`, 'success');
    closeModal();
    renderUsuarios();
  } catch (err) {
    console.error('[UI] Erro ao criar usuário:', err);
    const msg = err?.message || '';
    if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('email_exists')) {
      showErr('Este e-mail já está registrado no sistema de autenticação.');
    } else {
      showErr(`Erro ao criar usuário: ${msg || 'Tente novamente.'}`);
    }
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Criar Usuário'; }
  }
}

async function _refreshUsuarios() {
  if (!requirePermission('users:manage')) return;
  await DB.init(APP_MOCK);
  renderUsuarios();
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
    console.error(err);
    showToast("Erro ao atualizar: " + (err.message || err.details || "Tente novamente"), "error");
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
