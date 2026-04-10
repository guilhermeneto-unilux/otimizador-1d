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
  const name = document.getElementById('uName').value;
  const email = document.getElementById('uEmail').value;
  const password = document.getElementById('uPass').value;
  const role = document.getElementById('uRole').value;

  if (!name || !email || !password) { showToast("Preencha todos os campos!", "error"); return; }

  const newUser = { name, email, password, role };
  await DB.saveUser(newUser);
  await DB.log("Criou usuário", "unilux_users", `${name} (${role})`);
  
  showToast("Usuário criado com sucesso!", "success");
  closeModal();
  await DB.init(); // Refresh users
  renderUsuarios();
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
