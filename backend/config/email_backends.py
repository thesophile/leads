"""Email backends for the LEADS project.

``PrintAndSendEmailBackend`` delivers real mail over SMTP while also
mirroring the message to the terminal, so outgoing email stays visible.
"""

from django.core.mail.backends.console import EmailBackend as ConsoleEmailBackend
from django.core.mail.backends.smtp import EmailBackend as SMTPEmailBackend


class PrintAndSendEmailBackend(SMTPEmailBackend):
    """Send emails over SMTP and print each message to the terminal."""

    def send_messages(self, email_messages):
        ConsoleEmailBackend().send_messages(email_messages)
        return super().send_messages(email_messages)