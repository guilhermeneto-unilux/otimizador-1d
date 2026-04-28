function renderUsuarios() {
  if (appState.currentUser?.role !== 'admin') {
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
      <button class="btn btn-green" onclick="_novoUsuarioModal()">+ Novo Usuário</button>
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
              <td><div class="fw-700">${u.name}</div></td>
              <td>${u.email}</td>
              <td>
                <span class="status-badge ${u.role === 'admin' ? 'badge-batch' : 'badge-done'}">
                  ${u.role.toUpperCase()}
                </span>
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
    <div class="form-group">
      <label class="form-label">Nome Completo</label>
      <input type="text" id="uName" class="form-control" placeholder="Ex: Roberto Silva">
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input type="email" id="uEmail" class="form-control" placeholder="roberto@unilux.com.br">
    </div>
    <div class="form-group">
      <label class="form-label">Senha Inicial</label>
      <input type="text" id="uPass" class="form-control" value="unilux123">
    </div>
    <div class="form-group">
      <label class="form-label">Nível de Acesso</label>
      <select id="uRole" class="form-control">
        <option value="operador">Operador (Acesso restrito)</option>
        <option value="admin">Administrador (Acesso total)</option>
      </select>
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-green" onclick="_saveNewUser()">Criar Usuário</button>
  `);
}

async function _saveNewUser() {
  console.log('[DEBUG] Tentando criar novo usuário...');
  try {
    const name = document.getElementById('uName').value;
    const email = document.getElementById('uEmail').value;
    const password = document.getElementById('uPass').value;
    const role = document.getElementById('uRole').value;

    if (!name || !email || !password) { 
      showToast("Preencha todos os campos!", "error"); 
      return; 
    }

    const id = self.crypto.randomUUID();
    const newUser = { id, name, email, password, role };
    
    console.log('[DEBUG] Enviando para DB:', newUser);
    await DB.saveUser(newUser);
    await DB.log("Criou usuário", "unilux_users", `${name} (${role})`);
    
    showToast("Usuário criado com sucesso!", "success");
    closeModal();
    
    // Atualiza localmente antes do refresh total para agilidade
    if (!appState.users) appState.users = [];
    appState.users.push(newUser);
    
    renderUsuarios();
  } catch (err) {
    console.error('[CRITICAL] Erro em _saveNewUser:', err);
    showToast("Erro ao criar usuário. Veja o console.", "error");
  }
}

function _editUserModal(id) {
  const u = appState.users.find(x => x.id === id);
  if (!u) return;

  openModal(`Editar Usuário: ${u.name}`, `
    <div class="form-group">
      <label class="form-label">Nome Completo</label>
      <input type="text" id="uNameEdit" class="form-control" value="${u.name}">
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input type="email" id="uEmailEdit" class="form-control" value="${u.email}">
    </div>
    <div class="form-group">
      <label class="form-label">Trocar Senha (Opcional)</label>
      <input type="password" id="uPassEdit" class="form-control" placeholder="Deixe em branco para não mudar">
    </div>
    <div class="form-group">
      <label class="form-label">Nível de Acesso</label>
      <select id="uRoleEdit" class="form-control">
        <option value="operador" ${u.role === 'operador' ? 'selected' : ''}>Operador (Acesso restrito)</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador (Acesso total)</option>
      </select>
    </div>
  `, `
    <button class="btn btn-white" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-green" onclick="_saveEditedUser('${id}')">Salvar Alterações</button>
  `);
}

async function _saveEditedUser(id) {
  console.log('[DEBUG] Salvando edição de usuário:', id);
  try {
    const u = appState.users.find(x => x.id === id);
    if (!u) return;

    const name = document.getElementById('uNameEdit').value;
    const email = document.getElementById('uEmailEdit').value;
    const newPass = document.getElementById('uPassEdit').value;
    const role = document.getElementById('uRoleEdit').value;

    if (!name || !email) { showToast("Preencha Nome e Email!", "error"); return; }

    u.name = name;
    u.email = email;
    u.role = role;
    if (newPass) u.password = newPass;

    await DB.saveUser(u);
    await DB.log("Editou usuário", "unilux_users", `${u.name} (${u.role})`);
    
    showToast("Usuário atualizado!", "success");
    closeModal();
    renderUsuarios();
  } catch (err) {
    console.error('[CRITICAL] Erro em _saveEditedUser:', err);
    showToast("Erro ao atualizar. Veja o console.", "error");
  }
}

async function _deleteUser(id) {
  if (confirm("Deseja realmente remover este acesso?")) {
    await DB.deleteUser(id);
    await DB.log("Removeu usuário", "unilux_users", id);
    showToast("Usuário removido.");
    await DB.init(); // Refresh
    renderUsuarios();
  }
}
