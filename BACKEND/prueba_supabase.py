import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar variables de entorno desde el archivo .env
load_dotenv()

def obtener_todas_las_lecturas():
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("Faltan las variables de entorno SUPABASE_URL o SUPABASE_KEY")
        
    # Inicializar el cliente de Supabase
    supabase: Client = create_client(url, key)
    
    todos_los_datos = []
    limite_por_pagina = 1000
    inicio = 0
    
    print("Iniciando la descarga de datos...")
    
    while True:
        # Consultar datos usando rangos para evitar el limite de 1000 filas
        respuesta = (
            supabase.table("lecturas_davis")
            .select("*")
            .range(inicio, inicio + limite_por_pagina - 1)
            .execute()
        )
        
        datos_pagina = respuesta.data
        todos_los_datos.extend(datos_pagina)
        
        print(f"Descargadas {len(datos_pagina)} filas (Total acumulado: {len(todos_los_datos)})")
        
        # Si la pagina actual trajo menos filas que el limite, llegamos al final
        if len(datos_pagina) < limite_por_pagina:
            break
            
        inicio += limite_por_pagina
        
    return todos_los_datos
def obtener_registro_mas_antiguo():
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("Faltan las variables de entorno SUPABASE_URL o SUPABASE_KEY")
        
    supabase: Client = create_client(url, key)
    
    # Ordenamos por la hora del sensor de forma ascendente (de la más vieja a la más nueva)
    # y seleccionamos solo el primer registro (.limit(1))
    respuesta = (
        supabase.table("lecturas_davis")
        .select("*")
        .order("hora_sensor_utc", desc=True)
        .limit(1)
        .execute()
    )
    
    if respuesta.data:
        return respuesta.data[0]
    return None
def obtener_registro_mas_reciente():
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("Faltan las variables de entorno SUPABASE_URL o SUPABASE_KEY")
        
    supabase: Client = create_client(url, key)
    
    # Ordenamos por la hora del sensor de forma descendente (del más nuevo al más viejo)
    # y seleccionamos solo el primer registro (.limit(1))
    respuesta = (
        supabase.table("lecturas_davis")
        .select("*")
        .order("hora_sensor_utc", desc=True)
        .limit(1)
        .execute()
    )
    
    if respuesta.data:
        return respuesta.data[0]
    return None


def obtener_registro_por_id(id_buscar: int):
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("Faltan las variables de entorno SUPABASE_URL o SUPABASE_KEY")
        
    supabase: Client = create_client(url, key)
    
    # Filtramos donde la columna 'id' sea igual al valor proporcionado
    respuesta = (
        supabase.table("lecturas_davis")
        .select("*")
        .eq("id", id_buscar)
        .execute()
    )
    
    # .execute() devuelve una lista. Si encuentra el ID, tendrá un elemento.
    if respuesta.data:
        return respuesta.data[0]
    return None


if __name__ == "__main__":
    try:
        datos = obtener_todas_las_lecturas()
        print(f"\nProceso finalizado. Se recuperaron {len(datos)} registros en total.")
        
        # # Ejemplo: Mostrar los primeros 3 registros si existen
        # if datos:
        #     print("\nMuestra de los primeros registros:")
        #     for fila in datos[:3]:
        #         print(fila)
        #         # Uso:
        registro_antiguo = obtener_registro_mas_antiguo()
        print("El registro más antiguo es:", registro_antiguo)
        #         # Uso:
        id_a_consultar = 1
        registro = obtener_registro_por_id(id_a_consultar)
        # Uso:
        registro_reciente = obtener_registro_mas_reciente()
        print("El registro más reciente es:", registro_reciente)
        if registro:
            print(f"Registro encontrado para el ID {id_a_consultar}:")
            print(registro)
        else:
            print(f"No se encontró ningún registro con el ID {id_a_consultar}")
    except Exception as e:
        print(f"Ocurrio un error durante la ejecucion: {e}")