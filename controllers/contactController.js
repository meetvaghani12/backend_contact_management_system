const Contact = require("../models/contactModel");
const Joi = require("joi");
const fs = require("fs");

const contactSchema = Joi.object({
  _id: Joi.string().optional(),
  name: Joi.string().min(3).max(30).required().messages({
    "string.min": "Name must be at least 3 characters long.",
    "string.max": "Name cannot exceed 30 characters.",
    "any.required": "Name is required.",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Please enter a valid email address.",
    "any.required": "Email is required.",
  }),
  phone: Joi.string()
    .length(10)
    .pattern(/[6-9]{1}[0-9]{9}/)
    .required()
    .messages({
      "any.required": "Phone number is required.",
      "string.empty": "Phone number cannot be empty.",
      "string.length": "Phone number must be exactly 10 digits long.",
      "string.pattern.base": "Phone number is invalid.",
    }),
});

module.exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.send(contacts);
  } catch {
    res.status(500).send({ message: "Error fetching contacts" });
  }
};

module.exports.addContact = async (req, res) => {
  const { error } = contactSchema.validate(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });

  try {
    const { name, email, phone } = req.body;
    const newContact = await Contact.create({ name, email, phone });
    res.status(201).send(newContact);
  } catch {
    res.status(500).send({ message: "Error creating contact" });
  }
};

module.exports.updateContact = async (req, res) => {
  const { error } = contactSchema.validate(req.body);
  if (error) return res.status(400).send({ message: error.details[0].message });

  try {
    const { _id, name, email, phone } = req.body;
    const updatedContact = await Contact.findByIdAndUpdate(_id, { name, email, phone }, { new: true });
    if (!updatedContact) return res.status(404).send({ message: "Contact not found" });
    res.send(updatedContact);
  } catch {
    res.status(500).send({ message: "Error updating contact" });
  }
};

module.exports.deleteContact = async (req, res) => {
  const { _id } = req.body;
  try {
    const deletedContact = await Contact.findByIdAndDelete(_id);
    if (!deletedContact) return res.status(404).send({ message: "Contact not found" });
    res.send({ message: "Contact deleted successfully" });
  } catch {
    res.status(500).send({ message: "Error deleting contact" });
  }
};

module.exports.findDuplicates = async (req, res) => {
  try {
    const contacts = await Contact.find();
    const groupedContacts = contacts.reduce((acc, contact) => {
      const key = `${contact.name}-${contact.email}-${contact.phone}`;
      acc[key] = acc[key] || [];
      acc[key].push(contact);
      return acc;
    }, {});

    const duplicates = Object.values(groupedContacts).filter(group => group.length > 1);
    res.send(duplicates);
  } catch {
    res.status(500).send({ message: "Error finding duplicates" });
  }
};

module.exports.mergeContacts = async (req, res) => {
  const { contactIds, name, email, phone } = req.body;

  try {
    await Contact.deleteMany({ _id: { $in: contactIds } });
    const mergedContact = await Contact.create({ name, email, phone });
    res.send({ message: "Contacts merged successfully", mergedContact });
  } catch {
    res.status(500).send({ message: "Error merging contacts" });
  }
};

module.exports.exportContacts = async (req, res) => {
  try {
    const contacts = await Contact.find();
    if (contacts.length === 0) return res.status(404).send({ message: "No contacts found to export." });

    const vcfData = contacts.map(contact =>
      `BEGIN:VCARD\nVERSION:3.0\nFN:${contact.name}\nEMAIL:${contact.email}\nTEL:${contact.phone}\nEND:VCARD`
    ).join("\n");

    res.setHeader("Content-Disposition", "attachment; filename=contacts.vcf");
    res.setHeader("Content-Type", "text/vcard; charset=utf-8");
    res.send(vcfData);
  } catch {
    res.status(500).send({ message: "Error exporting contacts." });
  }
};

module.exports.importContacts = async (req, res) => {
  try {
    if (!req.file) return res.status(400).send({ message: "No file uploaded." });

    const fileContent = fs.readFileSync(req.file.path, "utf-8");
    const vCards = fileContent.split(/(?=BEGIN:VCARD)/);

    for (const vCard of vCards) {
      const nameMatch = vCard.match(/FN:(.*)/);
      const emailMatch = vCard.match(/EMAIL:(.*)/);
      const phoneMatch = vCard.match(/TEL:(.*)/);

      const name = nameMatch ? nameMatch[1].trim() : null;
      const email = emailMatch ? emailMatch[1].trim() : null;
      const phone = phoneMatch ? phoneMatch[1].trim() : null;

      if (!name || !email || !phone) continue;

      const newContact = new Contact({ name, email, phone });
      await newContact.save();
    }

    return res.status(200).send({ message: "Contacts imported successfully." });
  } catch {
    return res.status(500).send({ message: "Error importing contacts." });
  }
};
