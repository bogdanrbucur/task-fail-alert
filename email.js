import nodemailer from "nodemailer";

export default async function mailer(recipients, bodyArray, emailAuth, emailHost, emailPort) {
	// create reusable transporter object using the default SMTP transport
	let transporter = nodemailer.createTransport({
		host: emailHost,
		port: emailPort,
		secure: false, // true for 465, false for other ports
		auth: emailAuth,
		tls: {
			rejectUnauthorized: false,
		},
	});

	let emailBody = `<div style="font-family: calibri, sans-serif;">
  <p>Good morning,</p>
  <p>Follwing tasks failed on NL-Bogdan ⚠️</p>
  <ul>`;

	// add table rows for each entry in Excel
	bodyArray.forEach((element) => {
		emailBody += `<li>${element}</li>`;
	});

	let emailBodyEnd = `</ul>
  <p><span style="font-size: x-small;">This message is automatically generated by the Task Fail Alert script. For any issue, please contact its <a href="mailto:bogdanb-it@asm-maritime.com">developer</a>.</span></p>
  </div>`;

	// add the end of the email
	emailBody += emailBodyEnd;

	// send mail with defined transport object
	let info = await transporter.sendMail({
		from: "Failed Tasks <pal-notification@asm-maritime.com>", // sender address
		to: recipients, // list of receivers
		subject: `Failed tasks on NL-Bogdan ⚠️`, // Subject line
		// text: text, // plain text body
		html: emailBody, // html body
	});

	console.log(`Email sent to ${recipients}: ${info.messageId}`);
}

// mailer().catch(console.error);