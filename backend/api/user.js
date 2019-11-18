bcrypt = require("bcrypt-nodejs");

module.exports = app => {
  const { existsOrError, notExistsOrError, equalsOrError } = app.api.validation;

  const encryptPassword = password => {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  };

  const save = async (req, res) => {
    // Pega o usuario do corpo da requisição
    const user = { ...req.body };

    // Se já houver um id de usuario nos parametros da req, ele setea como id do usuario
    // o que também significa que é uma alteração, e não uma inserção
    if (req.params.id) user.id = req.params.id;

    // Correção de segurança, para um usuário não se cadastrar como admin
    if(!req.originalUrl.startsWith('/users')) user.admin = false;
    // Se não houver usuario cadastrando, e o usuario cadastrando não for admin, então false
    if(!req.user || !req.user.admin) user.admin = false

    // Faz aqui as validações ou retorna erro
    try {
      existsOrError(user.name, "Nome não informado");
      existsOrError(user.email, "Email não informado");
      existsOrError(user.password, "Senha não informada");
      existsOrError(user.confirmPassword, "Confirmação de senha não informada");
      equalsOrError(user.password, user.confirmPassword, "Senhas não conferem");

      const userFromDB = await app
        .db("users")
        .where({ email: user.email })
        .first();

      // Se não trouxer id e o usuário já for cadastrado, ele retorna erro, já que achou no banco
      if (!user.id) {
        notExistsOrError(userFromDB, "Usuário já cadastrado");
      }
    } catch (msg) {
      // Retorna um protocolo de erro de não encontrado
      return res.status(400).send(msg);
    }

    // Encrypta a senha trazida e deleta o campo confirmação, já que não será inserido
    user.password = encryptPassword(user.password);
    delete user.confirmPassword;

    // Se tiver ID, altera, senão insere
    if (user.id) {
      app
        .db("users")
        .update(user)
        .where({ id: user.id })
        .whereNull('deletedAt')
        .then(_ => res.status(204).send())
        .catch(err => res.status(500).send(err));
    } else {
      app
        .db("users")
        .insert(user)
        .then(_ => res.status(204).send())
        .catch(err => res.status(500).send(err));
    }
  };

  // Busca todos os usuários do sistema
  const get = (req, res) => {
    app
      .db("users")
      .select("id", "name", "email", "admin")
      .whereNull("deletedAt")
      .then(users => res.json(users))
      .catch(err => res.status(500).send(err));
  };

  const getById = (req, res) => {
    app
      .db("users")
      .select("id", "name", "email", "admin")
      .where({ id: req.params.id })
      .first()
      .whereNull("deletedAt")
      .then(user => res.json(user))
      .catch(err => res.status(500).send(err));
  };

  const remove = async (req, res) => {
    try {
      const articles = await app
        .db("articles")
        .where({ userId: req.params.id });

      notExistsOrError(articles, "Usuário possui artigos");

      const rowsUpdated = await app
        .db("users")
        .update({ deletedAt: new Date() })
        .where({ id: req.params.id });

      existsOrError(rowsUpdated, "Usuário não foi encontrado");

      res.status(204).send();
    } catch (msg) {
      res.status(400).send(msg);
    }
  };

  return { save, get, getById, remove };
};
