sp1-ansi.sql:		latin1
create proc sp1 as
begin
	-- تست
	set nocount on
end
go

---------------------------------------
sp1-unicode-1200.sql:		utf16le
﻿create proc sp1 as
begin
	-- تست
	set nocount on
end
go

---------------------------------------
sp1-unicode-1201.sql:		unsupported encoding utf16be (UTF-16BE)
undefined
---------------------------------------
sp1-utf8-bom.sql:		utf-8
﻿create proc sp1 as
begin
	-- تست
	set nocount on
end
go

---------------------------------------
sp1-utf8.sql:		utf-8
create proc sp1 as
begin
	-- تست
	set nocount on
end
go

---------------------------------------