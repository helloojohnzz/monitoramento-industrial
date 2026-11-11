import matplotlib.pyplot as plt
import pandas as pd
from sqlalchemy import create_engine

# ---------------------------------------------------------
# 1. CONEXÃO COM O MYSQL E LEITURA DOS DADOS
# ---------------------------------------------------------
usuario = 'root'
senha = 'root123456'
host = 'localhost'
porta = '3306'
nome_do_banco = 'db_industrial_monitoring'

engine = create_engine(
    f'mysql+pymysql://{usuario}:{senha}@{host}:{porta}/{nome_do_banco}'
)

query = 'SELECT id, date_time, is_metal FROM record'
# 1. Leitura dos dados
query = 'SELECT id, date_time, is_metal FROM record'
df = pd.read_sql(query, con=engine)

# --- CONVERSÃO DOS BYTES PARA BOOLEANO ---
# O PyMySQL lê o tipo BOOLEAN do MySQL como bytes (b'\x01' e b'\x00').
# Esta linha converte para True e False de verdade:
if df['is_metal'].dtype == object or isinstance(df['is_metal'].iloc[0], bytes):
  df['is_metal'] = df['is_metal'].apply(lambda x: x == b'\x01' or x == 1)

# 2. Tratamento e agrupamento
df['date_time'] = pd.to_datetime(df['date_time'])
df['apenas_data'] = df['date_time'].dt.date

df_grouped = (
    df.groupby(['apenas_data', 'is_metal'])['id']
    .count()
    .unstack(fill_value=0)
)

df_grouped = df_grouped.reindex(columns=[False, True], fill_value=0)
df_grouped.columns = ['Não Metálico', 'Metálico']

print('--- [DEBUG] DADOS AGRUPADOS CORRIGIDOS ---')
print(df_grouped)
print('----------------------------------------\n')

# 3. Geração do Gráfico
plt.figure(figsize=(10, 6))
df_grouped.plot(kind='line', marker='o', linewidth=2, figsize=(10, 5))

plt.title(
    'Quantidade de Produtos Metálicos e Não Metálicos ao Longo do Tempo',
    fontsize=14,
)
plt.xlabel('Data', fontsize=12)
plt.ylabel('Quantidade', fontsize=12)
plt.grid(True, linestyle='--', alpha=0.7)
plt.legend(title='Categoria')
plt.xticks(rotation=45)
plt.tight_layout()

plt.show()