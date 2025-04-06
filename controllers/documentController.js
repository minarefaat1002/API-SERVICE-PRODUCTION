const { User, Document, Permission } = require("../models/models");
const PermissionEnum = require("../types/enums/permission-enum");
const transporter = require("../services/emailService");
// const { getSequelize } = require("../db");
const { models } = require("../models/models");



const createDocument = async (req, res) => {
  const Permission = models.Permission;
  const Document = models.Document;
  try {
    const userId = req.user.userId;
    const title = req.body.title;

    const document = await Document.create({
      userId: userId,
      title: title,
    });

    const permission = await Permission.create({
      userId: userId,
      documentId: document.id,
      permissionType: PermissionEnum.OWNER,
    });
    console.log("reached@########");

    res.status(201).json({ message: "Created successfully" });
  } catch (error) {
    res.status(400).json({ message: "Something went wrong, please try again" });
  }
};

const getUserDocuments = async (req, res) => {
  const Permission = models.Permission;
  const Document = models.Document;
  const User = models.User;
  try {
    const userId = req.user.userId;
    const permissions = await Permission.findAll({
      where: { userId: userId },
      include: [
        { model: Document }, // load all documents
        {
          model: User,
          attributes: ["email"], // Only these columns from User
        },
      ],
    });

    // Extract just the documents
    const documents = permissions.map((perm) =>
      Object.assign(perm.Document["dataValues"], perm.User["dataValues"])
    );

    // // Extract just the document data
    return res.status(200).json({
      documents,
    });
  } catch (e) {
    console.log(e);
    res.status(400).json({
      message: "something went wrong, please try again.",
    });
  }
};

const getDocument = async (req, res) => {
  const Document = models.Document;
  try {
    const documentId = req.params.documentId;
    const document = await Document.findByPk(documentId);
    // TODO: get the document from s3
    return res.status(200).json(document);
  } catch (error) {
    res.status(400).json({ message: "Somethin went wrong" });
  }
};

const createPermission = async (req, res) => {
  const Document = models.Document;
  const Permission = models.Permission;
  try {
    const { documentId } = req.params;
    const document = await Document.findByPk(documentId);
    if (!document) return res.sendStatus(400);
    const userId = req.user.userId;
    if (userId != document.userId) return res.status(403);
    const { email, permission } = req.body;
    console.log(email);
    console.log(permission);
    const sharedUser = await User.findOne({
      where: {
        email: email,
      },
    });
    console.log("shared user1 " + sharedUser);
    if (!sharedUser) return res.sendStatus(400);
    await Permission.destroy({
      where: {
        userId: sharedUser.id,
        documentId: documentId,
      },
    });
    const p = await Permission.create({
      documentId: documentId,
      userId: sharedUser.id,
      permissionType: permission,
    });
    const mail = {
      from: "minarefaat1002@gmail.com",
      to: sharedUser.email,
      subject: `${req.user.email} shared a document with you!`,
      text: `Click the following link to view and edit the document : http://localhost:5173/documents/${documentId}`,
    };
    await transporter.sendMail(mail);

    return res.status(201).json(p);
  } catch (e) {
    console.log(e);
  }
};

const deletePermission = async (req, res) => {
  const Document = models.Document;
  const { documentId, userId } = req.params;
  console.log(userId);
  const document = await Document.findOne({
    where: {
      id: documentId,
      UserId: req.user.userId,
    },
  });

  if (!document) return res.sendStatus(400);

  const p = await Permission.destroy({
    where: {
      documentId,
      userId,
    },
  });

  if (!p) return res.sendStatus(400);
  // await Permission.destroy(query);
  return res.sendStatus(200);
};

module.exports = {
  createDocument,
  getUserDocuments,
  getDocument,
  createPermission,
  deletePermission,
};
