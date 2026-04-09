import streamlit as st

st.title("🔧 Otimizador 1D")

st.write("Sistema para otimização de cortes")

# Entrada
tamanho_barra = st.number_input("Tamanho da barra", min_value=0.0)

cortes = st.text_area("Cortes desejados (separados por vírgula)")

# Botão
if st.button("Otimizar"):
    st.write("Aqui vai aparecer o resultado...")