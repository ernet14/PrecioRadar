export type GuideSection = {
  heading: string;
  body: string;
};

export type Guide = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  category: string;
  readingMinutes: number;
  sections: GuideSection[];
  relatedProductSlugs: string[];
  relatedGuideSlugs: string[];
};

export const guides: Guide[] = [
  {
    slug: "hot-sale-argentina-2026-como-detectar-precios-inflados",
    title: "Guía Hot Sale Argentina 2026: cómo detectar precios inflados antes de comprar",
    description:
      "Cada año miles de argentinos caen en la trampa de las ofertas infladas del Hot Sale. Te explicamos cómo verificar si un precio es real usando historial, comparadores y datos concretos.",
    publishedAt: "2026-05-01",
    updatedAt: "2026-05-16",
    category: "Consejos de compra",
    readingMinutes: 7,
    relatedProductSlugs: ["samsung-galaxy-a55-5g-256gb", "smart-tv-samsung-crystal-uhd-55"],
    relatedGuideSlugs: [
      "comprar-celular-argentina-guia-2026",
      "mejores-notebooks-para-estudiar-argentina-2026",
    ],
    sections: [
      {
        heading: "¿Qué es el Hot Sale y por qué hay que ir con cuidado?",
        body: "El Hot Sale es el evento de e-commerce más grande de Argentina, organizado por la Cámara Argentina de Comercio Electrónico (CACE). Se realiza cada mayo y reúne a cientos de tiendas online con descuentos anunciados de hasta el 70%. El problema: muchas tiendas suben el precio de referencia semanas antes del evento para que el porcentaje de descuento parezca mayor de lo que realmente es. Esta práctica, conocida como 'precio inflado', está en el límite de la Ley 24.240 de Defensa del Consumidor.",
      },
      {
        heading: "La técnica del precio inflado: cómo funciona",
        body: "El mecanismo es simple: si un televisor vale $800.000 habitualmente, la tienda lo sube a $1.200.000 tres semanas antes del Hot Sale. El día del evento, lo 'baja' a $960.000 y anuncia un '20% OFF'. El consumidor ve el descuento, no el historial. Sin herramientas de comparación, es imposible detectarlo a simple vista. PrecioRadar registra el precio de cada producto cada 4 horas, por lo que el historial real está disponible desde el primer día del evento.",
      },
      {
        heading: "Cómo usar PrecioRadar durante el Hot Sale",
        body: "Antes de comprar cualquier producto en oferta: 1) Buscá el producto en PrecioRadar. 2) Revisá el gráfico de historial de precios. Si el precio subió en las últimas 2-3 semanas y ahora 'baja', probablemente estás ante un precio inflado. 3) Compará el precio actual con el promedio de los últimos 60 días. Si el precio actual es mayor al promedio histórico, no es una oferta real. 4) Activá una alerta para recibir un aviso si el precio baja por debajo de tu objetivo.",
      },
      {
        heading: "Señales de una oferta real vs. una oferta inflada",
        body: "Oferta real: el precio actual está por debajo del promedio histórico de 60 días, la tienda tiene reputación verde en MercadoLibre, el stock es limitado de verdad (se ve en el historial de disponibilidad), el descuento existe desde antes del Hot Sale. Oferta inflada: el precio subió 2-4 semanas antes del evento, el 'precio tachado' no aparece en ningún historial previo, múltiples tiendas tienen exactamente el mismo porcentaje de descuento, el producto nunca tuvo ese precio antes.",
      },
      {
        heading: "Categorías donde el precio inflado es más común",
        body: "Según datos históricos del mercado argentino, las categorías con mayor incidencia de precios inflados son: televisores (especialmente en hot sale y cybermonday), electrodomésticos de línea blanca (lavarropas, heladeras), indumentaria y calzado de marca. En tecnología y electrónica pequeña el fenómeno es menor pero existe, especialmente en accesorios y periféricos de marcas genéricas.",
      },
      {
        heading: "Checklist rápido antes de comprar en el Hot Sale",
        body: "Antes de hacer clic en 'Comprar': ✓ Revisá el historial en PrecioRadar (mínimo 30 días). ✓ Comparé el precio en al menos 2 tiendas. ✓ Verificá que el vendedor tenga buena reputación. ✓ Leé las políticas de cambio y devolución. ✓ Calculá el precio final con el medio de pago que vas a usar (algunos bancos dan descuento adicional). ✓ Verificá si hay cuotas sin interés reales o con costo financiero incluido.",
      },
      {
        heading: "¿Vale la pena esperar al CyberMonday?",
        body: "El CyberMonday (noviembre) es el segundo evento más importante. En general, los precios del Hot Sale y el CyberMonday son similares para la misma categoría. La excepción son productos de temporada: aires acondicionados conviene comprarlos antes del verano (agosto-octubre), no en Hot Sale. Los televisores suelen tener mejores precios reales en CyberMonday porque las tiendas necesitan liquidar stock antes de fin de año.",
      },
    ],
  },
  {
    slug: "comprar-celular-argentina-guia-2026",
    title: "Cómo comprar un celular en Argentina en 2026: guía completa para no pagar de más",
    description:
      "Todo lo que necesitás saber antes de comprar un smartphone en Argentina: qué modelos valen la pena, cómo comparar precios entre tiendas, y cuándo esperar para conseguir el mejor precio.",
    publishedAt: "2026-04-15",
    updatedAt: "2026-05-10",
    category: "Guías de compra",
    readingMinutes: 9,
    relatedProductSlugs: ["samsung-galaxy-a55-5g-256gb"],
    relatedGuideSlugs: [
      "hot-sale-argentina-2026-como-detectar-precios-inflados",
      "mejores-notebooks-para-estudiar-argentina-2026",
    ],
    sections: [
      {
        heading: "El mercado de celulares en Argentina: qué está pasando en 2026",
        body: "Argentina tiene uno de los mercados de smartphones más complejos de la región. La combinación de inflación, restricciones de importación históricas y el crecimiento del mercado formal de segunda mano hace que los precios fluctúen más que en cualquier otro país de LATAM. En 2026, la apertura importadora redujo los tiempos de espera para modelos nuevos, pero los precios en pesos siguen siendo muy sensibles al tipo de cambio.",
      },
      {
        heading: "Rangos de precio y qué esperar de cada uno",
        body: "En Argentina en 2026 existen tres segmentos claros: Gama de entrada (hasta $400.000): teléfonos funcionales para uso básico, cámara aceptable, sin 5G. Ideal para quien usa el celular principalmente para redes sociales y WhatsApp. Gama media ($400.000-$900.000): el mejor costo-beneficio del mercado. Modelos como el Samsung Galaxy A55 o el Motorola Edge 40 ofrecen muy buena cámara, 5G, y rendimiento sólido para los próximos 3 años. Gama alta (+$900.000): flagship completos, las mejores cámaras del mercado, procesadores top. Precio difícil de justificar a menos que la fotografía sea una prioridad real.",
      },
      {
        heading: "Samsung Galaxy A55: el punto dulce de la gama media en 2026",
        body: "El Samsung Galaxy A55 5G es el celular más buscado en PrecioRadar en mayo de 2026. Su combinación de pantalla AMOLED, 5G, 4 años de actualizaciones de software garantizadas y precio en gama media lo convierte en la opción más equilibrada del mercado. El precio varía entre tiendas: MercadoLibre suele ser más competitivo en precio base, pero algunas tiendas físicas como Frávega ofrecen beneficios bancarios que pueden reducir el precio efectivo.",
      },
      {
        heading: "¿Comprar en tienda física o en MercadoLibre?",
        body: "Ambas tienen ventajas. Tienda física: podés ver y tocar el producto, la garantía oficial es más fácil de gestionar, algunos bancos dan descuentos adicionales en cadenas como Frávega, Garbarino o Musimundo. MercadoLibre: precios generalmente más bajos, más opciones de vendedores, el sistema de reputación filtra las malas experiencias. La recomendación es: buscá el mejor precio en MercadoLibre para tener una referencia, luego negociá en tienda física con ese número en la mano. Muchas veces igualan el precio.",
      },
      {
        heading: "Cuándo comprar: momentos del año con mejores precios",
        body: "Los precios de celulares en Argentina tienen patrones estacionales claros. Los mejores momentos para comprar son: Hot Sale (mayo): precios competitivos en tiendas formales, verificar siempre que no estén inflados. CyberMonday (noviembre): buenos descuentos, especialmente en modelos que ya llevan varios meses en el mercado. Día del Padre (junio): muchas tiendas bajan precios en celulares. Los peores momentos: diciembre-enero (demanda alta por regalos de Navidad), lanzamiento de un modelo nuevo (el modelo anterior baja de precio pero el nuevo sube).",
      },
      {
        heading: "Cómo usar PrecioRadar para encontrar el mejor momento",
        body: "El flujo ideal es: 1) Buscá el modelo en PrecioRadar. 2) Activá una alerta con el precio objetivo. 3) Revisá el historial: si el precio bajó consistentemente en los últimos 30 días, probablemente siga bajando. 4) Si el precio está cerca del mínimo histórico, comprá ahora. 5) Comparé entre tiendas antes de hacer clic en comprar. Con datos reales de historial podés ver si ese 'precio especial' es realmente especial.",
      },
      {
        heading: "Garantía y servicio técnico: lo que nadie te dice",
        body: "En Argentina, la garantía legal mínima es de 6 meses (Ley 24.240), pero los fabricantes principales ofrecen 12 meses. Samsung tiene centros de servicio oficial en Buenos Aires, Córdoba, Rosario y Mendoza. Si comprás en MercadoLibre, verificá que el vendedor sea oficial o tenga acuerdo con el fabricante para garantía. Los celulares importados 'de afuera' pueden no tener garantía local y el service puede costar más caro que el celular mismo.",
      },
    ],
  },
  {
    slug: "mejores-notebooks-para-estudiar-argentina-2026",
    title: "Mejores notebooks para estudiar en Argentina 2026: guía y comparación de precios",
    description:
      "Comparamos las mejores notebooks para estudiantes disponibles en Argentina en 2026. Rendimiento, precio y historial: todo lo que necesitás para elegir sin arrepentirte.",
    publishedAt: "2026-03-20",
    updatedAt: "2026-05-12",
    category: "Guías de compra",
    readingMinutes: 8,
    relatedProductSlugs: ["notebook-lenovo-ideapad-slim-5-ryzen-7"],
    relatedGuideSlugs: [
      "hot-sale-argentina-2026-como-detectar-precios-inflados",
      "comprar-celular-argentina-guia-2026",
    ],
    sections: [
      {
        heading: "Qué necesita una notebook para estudiar en 2026",
        body: "Una notebook para estudiar en 2026 necesita cubrir tres escenarios: clases online con videollamadas, trabajo con documentos y presentaciones, y navegación web con múltiples pestañas. Para eso, los requisitos mínimos razonables son: procesador de última generación de 8 núcleos o más (Ryzen 5 o Intel Core i5 de 12th gen en adelante), 16 GB de RAM (8 GB quedó corto), almacenamiento SSD de 512 GB mínimo, pantalla de 14-15.6 pulgadas Full HD, batería de al menos 8 horas reales, peso inferior a 1.8 kg si vas a llevarla todos los días.",
      },
      {
        heading: "Lenovo IdeaPad Slim 5 Ryzen 7: la mejor opción relación precio-rendimiento",
        body: "El Lenovo IdeaPad Slim 5 con Ryzen 7 es consistentemente una de las mejores opciones para estudiantes en Argentina. Su procesador AMD Ryzen 7 ofrece un rendimiento que supera a muchos procesadores Intel del mismo precio. La pantalla IPS de 14 pulgadas tiene buena reproducción de color para diseño básico. La batería dura entre 8 y 10 horas reales según el uso. El precio en Argentina varía mucho entre tiendas: vale la pena usar PrecioRadar para encontrar el mejor momento de compra.",
      },
      {
        heading: "¿Ryzen o Intel? La respuesta definitiva para 2026",
        body: "Para uso de estudiante en Argentina en 2026, AMD Ryzen gana en casi todos los casos. La razón principal es el precio: los modelos con Ryzen suelen costar 15-20% menos que equivalentes con Intel, con rendimiento similar o superior en tareas del día a día. Intel Core Ultra (13th y 14th gen) tiene ventaja en edición de video y algunas aplicaciones de IA, pero para Word, Excel, Chrome, Zoom y programación básica, Ryzen 5 o Ryzen 7 son más que suficientes.",
      },
      {
        heading: "Notebooks a evitar: marcas y modelos con problemas conocidos",
        body: "Sin nombrar marcas específicas, hay algunas banderas rojas a evitar: notebooks con procesadores de 4 núcleos en 2026 (claramente subdimensionados), modelos con solo 8 GB RAM no expandible, pantallas TN de 1366x768 resolución (se ven muy mal), almacenamiento eMMC (mucho más lento que SSD NVMe), baterías de menos de 45 Wh (duran 3-4 horas reales). Si encontrás una notebook 'increíblemente barata' con estas características, el precio refleja sus limitaciones.",
      },
      {
        heading: "Cuánto gastar y dónde encontrar el mejor precio",
        body: "En Argentina en 2026, el rango razonable para una notebook de estudio es entre $700.000 y $1.200.000. Por debajo de eso empezás a comprometer en RAM o procesador. Por encima, estás pagando por características que un estudiante no necesita (tarjeta gráfica dedicada para juegos, pantalla 4K, etc.). Las mejores fuentes para encontrar precios son MercadoLibre (vendedores oficiales), el sitio oficial de Lenovo Argentina, y cadenas como Frávega. Usá PrecioRadar para comparar entre tiendas y ver el historial.",
      },
      {
        heading: "Accesorios indispensables que nadie menciona",
        body: "Antes de presupuestar solo la notebook, considerá estos accesorios que van a mejorar mucho tu experiencia: Hub USB-C con HDMI (para conectar a pantalla en casa, ~$15.000-25.000), mouse inalámbrico (la trackpad cansa en sesiones largas, ~$10.000-20.000), protector de pantalla (especialmente si la llevás en mochila), funda o sleeve con acolchado. El total de accesorios esenciales suma entre $25.000 y $60.000 en 2026.",
      },
      {
        heading: "¿Vale la pena comprar una notebook usada?",
        body: "Sí, con ciertas condiciones. El mercado de notebooks usadas en Argentina es razonablemente maduro en MercadoLibre. Lo que hay que verificar: batería con más del 80% de capacidad (se mide con software como BatteryInfoView en Windows), que tenga SSD y no disco rígido mecánico, que sea un modelo de 2022 en adelante para que soporte Windows 11 correctamente, que el vendedor tenga buena reputación. Una notebook usada de 2022-2023 puede ser significativamente mejor que una nueva de precio similar.",
      },
    ],
  },
  {
    slug: "mejores-placas-de-video-pc-gamer-argentina-2026",
    title: "Mejores placas de video para PC Gamer en Argentina 2026: RTX, RX y cómo elegir",
    description:
      "Comparamos las placas de video disponibles en Argentina en 2026 por precio y rendimiento. Desde opciones de entrada hasta las RTX más potentes, con historial de precios real.",
    publishedAt: "2026-04-01",
    updatedAt: "2026-05-14",
    category: "PC Gamer",
    readingMinutes: 8,
    relatedProductSlugs: ["nvidia-geforce-rtx-5070-12gb"],
    relatedGuideSlugs: [
      "hot-sale-argentina-2026-como-detectar-precios-inflados",
      "mejores-notebooks-para-estudiar-argentina-2026",
    ],
    sections: [
      {
        heading: "El mercado de placas de video en Argentina en 2026",
        body: "En 2026, el mercado de placas de video en Argentina es más dinámico que nunca. La apertura importadora redujo los tiempos entre lanzamiento global y disponibilidad local, aunque los precios siguen siendo altos en comparación con Estados Unidos o Europa. La serie RTX 5000 de NVIDIA ya está disponible en el mercado local, mientras que AMD compite con la serie RX 9000. La elección entre NVIDIA y AMD depende más del juego y el presupuesto que de la lealtad de marca.",
      },
      {
        heading: "RTX 5070: el nuevo punto de equilibrio para gaming en 1440p",
        body: "La NVIDIA GeForce RTX 5070 es la placa que más buscan los jugadores argentinos en 2026. Ofrece rendimiento de alta gama en resoluciones 1440p y 4K con DLSS 4, y su precio la ubica en la gama media-alta. El precio en Argentina varía significativamente según el vendedor y el fabricante de la placa (ASUS, Gigabyte, MSI, Palit). PrecioRadar permite comparar el mismo chip entre distintos fabricantes y ver si el precio actual está cerca del mínimo histórico.",
      },
      {
        heading: "¿RTX 5070 o RX 9070 XT? La comparación honesta",
        body: "Para gaming puro a 1440p, la AMD RX 9070 XT compite muy de cerca con la RTX 5070 a un precio generalmente menor. La ventaja de NVIDIA está en el DLSS 4 (superior al FSR de AMD en la mayoría de los juegos), el ecosistema de funciones adicionales (RTX Remix, DLAA), y el soporte en juegos competitivos que optimizan para CUDA. La ventaja de AMD es el precio y el driver OpenSource que funciona mejor en Linux. Si jugás principalmente con Steam y títulos AAA recientes, NVIDIA tiene ventaja. Si el presupuesto manda, AMD ofrece mejor costo-beneficio.",
      },
      {
        heading: "Opciones por presupuesto en Argentina 2026",
        body: "Entrada (hasta $600.000): RTX 4060 o RX 7600, aptas para 1080p a configuraciones medias-altas en la mayoría de los juegos. Gama media ($600.000-$1.000.000): RTX 4070 o RX 7700 XT, gaming sólido en 1440p. Gama alta ($1.000.000-$1.500.000): RTX 5070 o RX 9070 XT, el punto dulce de 2026. Ultra (+$1.500.000): RTX 5080 o RTX 5090, para 4K o resoluciones ultra. El salto de precio entre gama alta y ultra es enorme y difícil de justificar para gaming convencional.",
      },
      {
        heading: "Cómo elegir entre fabricantes de la misma placa",
        body: "Una RTX 5070 de ASUS ROG Strix va a ser más cara que la misma placa de Palit o Gainward, pero incluye mejor sistema de refrigeración, mayor overclocking de fábrica y garantía más sólida. Para la mayoría de los usuarios, la variante más económica de una placa (generalmente Dual o Windforce de Gigabyte) ofrece el mismo rendimiento con una diferencia de temperatura de 3-5 grados. La excepción es si tenés un gabinete con poco flujo de aire: ahí vale la pena el modelo con mejor cooler.",
      },
      {
        heading: "Cuándo comprar una placa de video: la estrategia correcta",
        body: "Las placas de video tienen un ciclo de vida de 18-24 meses antes de que llegue la siguiente generación. La estrategia inteligente: comprá cuando el precio esté cerca del mínimo histórico (PrecioRadar te avisa con alertas), evitá comprar en el lanzamiento (precio máximo + bugs de driver), esperá 3-4 meses después del lanzamiento para que el precio se estabilice y los drivers maduren. Durante Hot Sale y CyberMonday los precios suelen bajar, pero verificá siempre el historial antes de comprar.",
      },
      {
        heading: "Compatibilidad: lo que nadie chequea y después lamenta",
        body: "Antes de comprar la placa, verificá: ¿Tu fuente de poder tiene los conectores correctos? Las RTX 5000 requieren conector 16-pin (puede adaptarse con 3x8-pin). ¿Tu motherboard tiene una ranura PCIe 4.0 o 5.0? (PCIe 3.0 limita levemente el rendimiento). ¿El gabinete tiene espacio para la longitud de la placa? Algunas RTX 5070 miden más de 33 cm. ¿Tu monitor soporta la resolución y tasa de refresco para la que estás comprando la placa?",
      },
    ],
  },
  {
    slug: "como-elegir-smart-tv-argentina-2026",
    title: "Cómo elegir un Smart TV en Argentina 2026: guía para no arrepentirte",
    description:
      "Pantalla, resolución, sistema operativo y precio: todo lo que necesitás saber para elegir el mejor Smart TV en Argentina en 2026. Con comparación de precios en tiendas locales.",
    publishedAt: "2026-04-20",
    updatedAt: "2026-05-15",
    category: "Guías de compra",
    readingMinutes: 7,
    relatedProductSlugs: ["smart-tv-samsung-crystal-uhd-55"],
    relatedGuideSlugs: [
      "hot-sale-argentina-2026-como-detectar-precios-inflados",
      "comprar-celular-argentina-guia-2026",
    ],
    sections: [
      {
        heading: "El mercado de televisores en Argentina en 2026",
        body: "Los televisores son una de las categorías con mayor presencia de precios inflados en Hot Sale y CyberMonday en Argentina. La buena noticia es que el mercado local tiene opciones de calidad real en todas las franjas de precio. Las marcas más confiables en el mercado argentino son Samsung, LG, TCL y Philips. Las marcas blancas o importadas sin servicio técnico local representan un riesgo real si el televisor falla fuera de garantía.",
      },
      {
        heading: "¿Qué tamaño elegir? La fórmula que siempre funciona",
        body: "La distancia de visualización ideal es 1.5 a 2.5 veces el tamaño de la diagonal. Para una habitación donde estás a 3 metros del televisor: 3m ÷ 1.5 = 2m de diagonal máximo, que equivale a 80 pulgadas. 3m ÷ 2 = 1.5m, que equivale a 60 pulgadas. En la práctica: para dormitorio de tamaño estándar, 43-50 pulgadas. Para living comedor, 55-65 pulgadas. Para home cinema o living grande, 75 pulgadas o más.",
      },
      {
        heading: "4K vs. Full HD: ¿vale la diferencia de precio?",
        body: "En 2026, la respuesta es sí en casi todos los casos. Los televisores 4K cuestan apenas 15-20% más que Full HD del mismo tamaño, y la diferencia de imagen es notable especialmente en pantallas de 50 pulgadas o más. El contenido 4K ya está disponible en Netflix, Disney+, YouTube y los servicios de streaming más populares. La única excepción donde Full HD tiene sentido: televisores de 32 pulgadas para habitaciones pequeñas, donde la diferencia de resolución es imperceptible a distancia normal.",
      },
      {
        heading: "Samsung Crystal UHD 55: la referencia de gama media en 2026",
        body: "El Samsung Crystal UHD de 55 pulgadas es el televisor más buscado en PrecioRadar en su segmento. Ofrece panel 4K con tecnología Crystal de Samsung, sistema operativo Tizen (uno de los más completos del mercado), 3 puertos HDMI 2.1, y procesador Crystal 4K. El punto a considerar: es un panel LED LCD, no OLED, por lo que los negros no son tan profundos. Para contenido HDR en habitación con luz, la diferencia es mínima. Para home cinema con luz controlada, un OLED ofrece mejor experiencia.",
      },
      {
        heading: "OLED vs. QLED vs. LED: qué significa cada cosa",
        body: "LED/LCD es la tecnología base: más económica, bien iluminada, ideal para habitaciones con mucha luz. Crystal, NanoCell, QLED son mejoras sobre LED con mejor reproducción de color y brillo. OLED es una tecnología distinta: cada píxel emite luz propia, logra negros perfectos, es ideal para cine en ambientes oscuros. En Argentina en 2026, un OLED de 55 pulgadas cuesta entre 2 y 3 veces más que un LED de la misma pulgada. Para la mayoría del uso diario (noticias, series, fútbol), un buen LED o QLED es más que suficiente.",
      },
      {
        heading: "Sistema operativo: Tizen, Google TV o webOS",
        body: "Los tres sistemas son buenos en 2026 y tienen las apps principales (Netflix, Disney+, YouTube, Amazon). La diferencia está en: Tizen (Samsung): interfaz muy pulida, mejor integración con dispositivos Samsung. Google TV (TCL, Sony, Philips): mejor integración con Google Assistant y Chromecast. webOS (LG): excelente para control por voz y control remoto 'Magic Remote'. Evitá televisores con sistemas operativos propietarios desconocidos: se quedan sin actualizaciones rápidamente.",
      },
      {
        heading: "Cuándo comprar un televisor: la estrategia de timing",
        body: "Los televisores tienen dos momentos de precio bajo al año: Hot Sale (mayo) y CyberMonday (noviembre). Sin embargo, como detallamos en nuestra guía de Hot Sale, el precio previo al evento suele subir para hacer el descuento parecer mayor. La estrategia correcta es activar una alerta en PrecioRadar con el precio objetivo y esperar a que el mercado llegue a ese valor, sea Hot Sale, CyberMonday o cualquier otra fecha. El historial muestra que los precios reales bajan de forma escalonada durante el año, no solo en eventos.",
      },
    ],
  },
];

export function getGuideBySlug(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}

export function getAllGuideSlugs(): string[] {
  return guides.map((g) => g.slug);
}
