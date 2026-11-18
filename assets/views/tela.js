import { render as base } from '../crud.js';

const CONFIG = {
  "titulo": "Produtos",
  "tabela": "produtos",
  "modulo": "produtos",
  "singular": "produto",
  "ordem": "sku",
  "filtro": "SKU, EAN ou descrição",
  "extra": {
    "origem": "cadastro"
  },
  "colunas": [
    {
      "campo": "sku",
      "rotulo": "SKU",
      "classe": "mono"
    },
    {
      "campo": "ean",
      "rotulo": "EAN",
      "classe": "mono"
    },
    {
      "campo": "descricao",
      "rotulo": "Descrição"
    },
    {
      "campo": "unidade",
      "rotulo": "Un."
    },
    {
      "campo": "categoria_id",
      "rotulo": "Categoria",
      "de": {
        "tabela": "arm_categorias",
        "rotulo": "descricao"
      }
    },
    {
      "campo": "ativo",
      "rotulo": "Ativo"
    }
  ],
  "campos": [
    {
      "campo": "sku",
      "rotulo": "SKU",
      "obrigatorio": true
    },
    {
      "campo": "ean",
      "rotulo": "EAN"
    },
    {
      "campo": "descricao",
      "rotulo": "Descrição",
      "obrigatorio": true
    },
    {
      "campo": "unidade",
      "rotulo": "Unidade",
      "obrigatorio": true
    },
    {
      "campo": "categoria_id",
      "rotulo": "Categoria",
      "tipo": "select",
      "de": {
        "tabela": "arm_categorias",
        "rotulo": "descricao"
      }
    },
    {
      "campo": "subcategoria_id",
      "rotulo": "Subcategoria",
      "tipo": "select",
      "de": {
        "tabela": "arm_subcategorias",
        "rotulo": "descricao"
      }
    },
    {
      "campo": "familia_id",
      "rotulo": "Família",
      "tipo": "select",
      "de": {
        "tabela": "arm_familias",
        "rotulo": "descricao"
      }
    },
    {
      "campo": "quantidade_por_embalagem",
      "rotulo": "Quantidade por embalagem",
      "tipo": "numero"
    },
    {
      "campo": "ativo",
      "rotulo": "Ativo",
      "tipo": "check"
    }
  ]
};

export function render(raiz, ctx) {
  return base(raiz, ctx, CONFIG);
}
