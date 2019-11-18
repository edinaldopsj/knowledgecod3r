module.exports = app => {
  const { existsOrError, notExistsOrError } = app.api.validation;

  const save = (req, res) => {
    // Busca a categoria do corpo da requisicao
    const category = {
      name: req.body.name,
      parentId: req.body.parentId
    };

    // Se existir um parametro de id de cat, ele recebe
    if (req.params.id) category.id = req.params.id;

    // Validações de existencia senao mesmagem
    try {
      existsOrError(category.name, "Nome não informado");
    } catch (msg) {
      return res.status(400).send(msg);
    }

    // Se houver id altera, se não houver insere
    if (category.id) {
      app
        .db("categories")
        .update(category)
        .where({ id: category.id })
        .then(_ => res.status(204).send())
        .catch(err => res.status(500).send(err));
    } else {
      app
        .db("categories")
        .insert(category)
        .then(_ => res.status(204).send())
        .catch(err => res.status(500).send(err));
    }
  };

  // Faz o delete da categoria, mas só se ela não estiver vinculada a mais nada
  const remove = async (req, res) => {
    try {
      existsOrError(req.params.id, "Código da categoria não informado");

      // Procura uma subcategoria com o esse id, para mandar remove-la antes de deleta-la
      const subcategory = await app
        .db("categories")
        .where({ parentId: req.params.id });

      notExistsOrError(subcategory, "Categoria possui subcategorias");

      // Agora ve se os artigos tem essa categoria? AI não deixa deletar
      const articles = await app
        .db("articles")
        .where({ categoryId: req.params.id });

      notExistsOrError(articles, "Categoria possui artigos");

      // Se até aqui nada parou, ele tenta deletar do sistema
      const rowsDeleted = await app
        .db("categories")
        .where({ id: req.params.id })
        .del();

      // Se ele ainda encontrar as linhas que eram pra ter sido deletadas, ele retorna erro
      existsOrError(rowsDeleted, "Categoria não foi encontrada");

      //Se nada der errado, envia código de sucesso
      res.status(204).send();
    } catch (msg) {
      // Senao pega o erro e envia a mensagem
      res.status(400).send(msg);
    }
  };

  // Função que monta os caminhos para as categorias, seus pais e filhos
  const withPath = categories => {
    // Função que retorna o pai daquela categoria
    const getParent = (categories, parentId) => {
      const parent = categories.filter(parent => parent.id === parentId);
      return parent.length ? parent[0] : null;
    };

    // Monta o texto da categoria com seus pais, filhos, netos...
    const categoriesWithPath = categories.map(category => {
      let path = category.name;
      let parent = getParent(categories, category.parentId);

      // Ele busca acima os pais de cada categoria que ele vai passando
      // e vai concatenando o sinal de maior assim: pai > filho
      while (parent) {
        path = `${parent.name} > ${path}`;
        parent = getParent(categories, parent.parentId);
      }

      return { ...category, path };
    });

    // Aqui faz a ordenação por ordem alfabética das categorias pai e das filhas
    categoriesWithPath.sort((a, b) => {
      if (a.path < b.path) return -1;
      if (a.path < b.path) return 1;
      return 0;
    });

    // Depois de tudo concatenado e ordenado retorna na função
    return categoriesWithPath;
  };

  const get = (req, res) => {
    app
      .db("categories")
      .then(categories => res.json(withPath(categories)))
      .catch(err => res.status(500).send(err));
  };

  const getById = (req, res) => {
    app
      .db("categories")
      .where({ id: req.params.id })
      .first()
      .then(category => res.json(category))
      .catch(err => res.status(500).send(err));
  };

  // Função que monta a arvore de menus e suas filhas
  const toTree = (categories, tree) => {
    // Monta as categorias sem pai, usando o filter pra pega-las
    if (!tree) tree = categories.filter(c => !c.parentId);
    tree = tree.map(parentNode => {
      // Aqui dentro pega os filhos dos pais e dos seus netos
      const isChild = node => node.parentId == parentNode.id;
      parentNode.children = toTree(categories, categories.filter(isChild));

      return parentNode;
    });

    return tree;
  };

  // Pega as categorias no banco para trasnformar em arvore
  const getTree = (req, res) => {
    app
      .db("categories")
      .then(categories => res.json(toTree(categories)))
      .catch(err => res.status(500).send(err));
  };

  return { save, remove, get, getById, getTree };
};
